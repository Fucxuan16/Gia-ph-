import { mkdir, readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const files = [
  ["/", "index.html", "text/html; charset=utf-8"],
  ["/app.js", "app.js", "text/javascript; charset=utf-8"],
  ["/style.css", "style.css", "text/css; charset=utf-8"],
  ["/favicon.svg", "favicon.svg", "image/svg+xml"],
  ["/banyan.jpg", "banyan.jpg", "image/jpeg"]
];
const assets = {};
for (const [path, file, type] of files) {
  const binary = type === "image/jpeg";
  const content = await readFile(new URL("web/" + file, root));
  assets[path] = { type, binary, data: content.toString(binary ? "base64" : "utf8") };
}

const worker = await readFile(new URL("worker/index.mjs", root), "utf8");
await mkdir(new URL("dist/server/", root), { recursive: true });
await writeFile(new URL("dist/server/index.js", root), "const assets = " + JSON.stringify(assets) + ";\n" + worker);
