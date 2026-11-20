const payloadLimit = 1024 * 1024;
const memberLimit = 8000;
const memberId = /^[a-zA-Z0-9_-]{1,100}$/;
const adminCookie = "__Host-nep-nha-admin";
const sessionSeconds = 8 * 60 * 60;
const attemptWindowSeconds = 10 * 60;
const attemptLimit = 6;
const encoder = new TextEncoder();

function json(body, status = 200, extraHeaders = {}) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extraHeaders }
  });
}

function sameOrigin(request) {
  return request.headers.get("origin") === new URL(request.url).origin;
}

async function readJson(request, limit) {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return { status: 415 };
  }
  if (Number(request.headers.get("content-length")) > limit) return { status: 413 };
  if (!request.body) return { status: 400 };

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > limit) {
        await reader.cancel().catch(() => {});
        return { status: 413 };
      }
      text += decoder.decode(value, { stream: true });
    }
    return { data: JSON.parse(text + decoder.decode()) };
  } catch {
    return { status: 400 };
  } finally {
    reader.releaseLock();
  }
}

async function digest(text) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(text)));
}

function hex(bytes) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function matchingPassword(input, expected) {
  const [left, right] = await Promise.all([digest(input), digest(expected)]);
  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}

function cookieToken(request) {
  const prefix = adminCookie + "=";
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const cookie = part.trim();
    if (cookie.startsWith(prefix)) {
      const token = cookie.slice(prefix.length);
      return /^[a-f0-9]{64}$/.test(token) ? token : null;
    }
  }
  return null;
}

function sessionCookie(token, seconds) {
  return adminCookie + "=" + token + "; Path=/; Max-Age=" + seconds + "; Secure; HttpOnly; SameSite=Strict";
}

async function sessionHash(token, password) {
  return hex(await digest("nep-nha-admin:" + password + ":" + token));
}

async function canEditTree(request, env) {
  const token = cookieToken(request);
  if (!token || !env.TREE_ADMIN_PASSWORD) return false;
  const tokenHash = await sessionHash(token, env.TREE_ADMIN_PASSWORD);
  return !!await env.DB.prepare(
    "SELECT 1 FROM admin_sessions WHERE token_hash = ? AND expires_at > ?"
  ).bind(tokenHash, Date.now()).first();
}

async function startAdminSession(request, env) {
  const secret = env.TREE_ADMIN_PASSWORD;
  if (!secret) return json({ error: "unavailable" }, 503);
  const { data, status } = await readJson(request, 2048);
  if (status) return json({ error: "invalid_request" }, status);
  if (typeof data?.password !== "string" || !data.password.length || data.password.length > 200) {
    return json({ error: "wrong_password" }, 400);
  }

  const now = Date.now();
  const address = request.headers.get("cf-connecting-ip") || "unknown";
  const visitorKey = hex(await digest("nep-nha-attempt:" + address));
  const attempt = await env.DB.prepare(`
    INSERT INTO admin_login_limits (visitor_key, expires_at, attempts)
    VALUES (?, ?, 1)
    ON CONFLICT (visitor_key) DO UPDATE SET
      attempts = CASE WHEN expires_at <= ? THEN 1 ELSE attempts + 1 END,
      expires_at = CASE WHEN expires_at <= ? THEN excluded.expires_at ELSE expires_at END
    WHERE expires_at <= ? OR attempts < ?
    RETURNING attempts
  `).bind(visitorKey, now + attemptWindowSeconds * 1000, now, now, now, attemptLimit).first();
  if (!attempt) return json({ error: "rate_limited" }, 429, { "Retry-After": String(attemptWindowSeconds) });
  if (!await matchingPassword(data.password, secret)) return json({ error: "wrong_password" }, 401);

  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const tokenHash = await sessionHash(token, secret);
  const oldToken = cookieToken(request);
  const oldHash = oldToken ? await sessionHash(oldToken, secret) : "";
  await env.DB.batch([
    env.DB.prepare("DELETE FROM admin_login_limits WHERE visitor_key = ? OR expires_at <= ?").bind(visitorKey, now),
    env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ? OR expires_at <= ?").bind(oldHash, now),
    env.DB.prepare("INSERT INTO admin_sessions (token_hash, expires_at) VALUES (?, ?)").bind(tokenHash, now + sessionSeconds * 1000)
  ]);
  return json({ canEdit: true }, 200, { "Set-Cookie": sessionCookie(token, sessionSeconds) });
}

async function serveAdminSession(request, env) {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  try {
    if (request.method === "POST") return await startAdminSession(request, env);
    if (request.method !== "DELETE") return json({ error: "method" }, 405, { Allow: "POST, DELETE" });
    const token = cookieToken(request);
    if (token && env.TREE_ADMIN_PASSWORD) {
      const tokenHash = await sessionHash(token, env.TREE_ADMIN_PASSWORD);
      await env.DB.prepare("DELETE FROM admin_sessions WHERE token_hash = ?").bind(tokenHash).run();
    }
    return json({ canEdit: false }, 200, { "Set-Cookie": sessionCookie("", 0) });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}

function validateTree(input) {
  if (!Array.isArray(input) || input.length > memberLimit) return null;
  if (!input.length) return [];
  const members = [];
  const children = new Map();
  let root;
  for (const entry of input) {
    if (!entry || typeof entry.name !== "string" || typeof entry.id !== "string" ||
      !memberId.test(entry.id) || children.has(entry.id)) return null;
    const name = entry.name.trim().replace(/\s+/g, " ");
    if (!name || name.length > 100) return null;
    if (entry.parentId === null) {
      if (root !== undefined) return null;
      root = entry.id;
    } else if (typeof entry.parentId !== "string" || !memberId.test(entry.parentId)) {
      return null;
    }
    members.push({ id: entry.id, name, parentId: entry.parentId });
    children.set(entry.id, []);
  }
  if (root === undefined) return null;

  for (const member of members) {
    if (member.parentId === null) continue;
    const siblings = children.get(member.parentId);
    if (!siblings) return null;
    siblings.push(member.id);
  }
  const connected = [root];
  for (const id of connected) {
    for (const child of children.get(id)) connected.push(child);
  }
  return connected.length === members.length ? members : null;
}

async function updateTree(request, env) {
  if (!sameOrigin(request) || !await canEditTree(request, env)) return json({ error: "forbidden" }, 403);
  const { data, status } = await readJson(request, payloadLimit);
  if (status) return json({ error: status === 413 ? "too_large" : "invalid_tree" }, status);
  if (!data || !Number.isSafeInteger(data.revision) || data.revision < 0) {
    return json({ error: "invalid_tree" }, 400);
  }
  const members = validateTree(data.members);
  if (!members || (!members.length && data.revision === 0)) return json({ error: "invalid_tree" }, 400);
  const snapshot = JSON.stringify(members);
  const updated = data.revision === 0
    ? await env.DB.prepare(
      "INSERT INTO family_tree (id, revision, members_json) VALUES (1, 1, ?) ON CONFLICT (id) DO NOTHING"
    ).bind(snapshot).run()
    : await env.DB.prepare(
      "UPDATE family_tree SET revision = revision + 1, members_json = ? WHERE id = 1 AND revision = ?"
    ).bind(snapshot, data.revision).run();

  if (updated.meta.changes !== 1) return json({ error: "conflict" }, 409);
  return json({ revision: data.revision + 1, members, canEdit: true });
}

async function serveTree(request, env) {
  try {
    if (request.method === "PUT") return await updateTree(request, env);
    if (request.method !== "GET") return json({ error: "method" }, 405, { Allow: "GET, PUT" });
    const row = await env.DB.prepare("SELECT revision, members_json FROM family_tree WHERE id = 1").first();
    return json({
      revision: row?.revision ?? 0,
      members: row ? JSON.parse(row.members_json) : [],
      canEdit: await canEditTree(request, env)
    });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
}

export default {
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (path === "/api/tree") return serveTree(request, env);
    if (path === "/api/admin/session") return serveAdminSession(request, env);
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 405, headers: { Allow: "GET, HEAD" } });
    }
    const asset = Object.hasOwn(assets, path) ? assets[path] : null;
    if (!asset) return new Response("Không tìm thấy trang.", { status: 404 });
    const body = request.method === "HEAD" ? null
      : asset.binary ? Uint8Array.from(atob(asset.data), (char) => char.charCodeAt(0))
      : asset.data;
    return new Response(body, {
      headers: {
        "Content-Type": asset.type,
        "Cache-Control": path === "/" ? "no-cache" : "public, max-age=300",
        "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'self'",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer"
      }
    });
  }
};
