"use strict";

const icons = {
  tree: '<path d="M12 19V6m0 9C7 15 4 12 4 8c5 0 8 3 8 7Zm0-3c0-4 3-7 8-7 0 4-3 7-8 7ZM8 20h8"/>',
  leaf: '<path d="M20 4C12 4 5 7 5 14a5 5 0 0 0 5 5c7 0 10-7 10-15ZM3 21l10-10"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 1 1 8 0v4m-4 4v2"/>',
  link: '<path d="m10 13 4-4m-6 5-1 1a3.5 3.5 0 0 0 5 5l3-3a3.5 3.5 0 0 0 0-5m1-2 1-1a3.5 3.5 0 0 0-5-5L9 7a3.5 3.5 0 0 0 0 5"/>',
  users: '<path d="M15 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-4m-2-10a4 4 0 0 1 0 8"/><circle cx="9" cy="8" r="4"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 4 9 5 9-5"/>',
  branch: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4m-6 4v-4h12v4"/>',
  "user-plus": '<circle cx="9" cy="7" r="4"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2m3-14v6m-3-3h6"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  eye: '<path d="M2 12s3.7-6 10-6 10 6 10 6-3.7 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="2.5"/>',
  fit: '<path d="M9 4H4v5m11-5h5v5m0 6v5h-5m-6 0H4v-5"/>',
  move: '<path d="M12 3v18m-9-9h18M9 6l3-3 3 3m-6 12 3 3 3-3M6 9l-3 3 3 3m12-6 3 3-3 3"/>',
  edit: '<path d="m15 5 4 4M4 20l5-1L20 8a2.8 2.8 0 0 0-4-4L5 15l-1 5Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  trash: '<path d="M4 6h16M9 6V3h6v3m3 0-1 15H7L6 6m4 4v7m4-7v7"/>'
};

const $ = (id) => document.getElementById(id);
const svg = (name) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + icons[name] + '</svg>';
document.querySelectorAll("[data-icon]").forEach((element) => {
  element.innerHTML = svg(element.dataset.icon);
});

const demo = [
  { id: "m1", name: "Nguyễn Văn Khôi", parentId: null },
  { id: "m2", name: "Nguyễn Văn Minh", parentId: "m1" },
  { id: "m3", name: "Nguyễn Thị Hạnh", parentId: "m1" },
  { id: "m4", name: "Nguyễn Văn Tùng", parentId: "m1" },
  { id: "m5", name: "Nguyễn Quốc An", parentId: "m2" },
  { id: "m6", name: "Nguyễn Bảo Ngọc", parentId: "m2" },
  { id: "m7", name: "Trần Gia Linh", parentId: "m3" },
  { id: "m8", name: "Nguyễn Tuấn Anh", parentId: "m4" },
  { id: "m9", name: "Nguyễn Mai Chi", parentId: "m4" }
];

function readPreviousTree() {
  try {
    const raw = localStorage.getItem("nep-nha.members.v1");
    if (!raw) return [];
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved) || saved.some((item) => !item || typeof item.id !== "string" ||
      typeof item.name !== "string" || (item.parentId !== null && typeof item.parentId !== "string"))) {
      throw new Error("Dữ liệu đã lưu không hợp lệ");
    }
    if (saved.length && indexMembers(saved).order.length !== saved.length) {
      throw new Error("Quan hệ giữa các thành viên không hợp lệ");
    }
    return saved;
  } catch {
    return [];
  }
}

const branchTones = ["amber", "olive", "plum", "forest"];
const toneEdges = { forest: "#9db6a1", amber: "#c4ac7f", olive: "#a8b794", plum: "#c2a39d" };

function indexMembers(records) {
  const byId = new Map(records.map((member) => [member.id, {
    ...member, children: [], generation: 0, tone: "forest"
  }]));
  const order = [];
  const roots = [];
  for (const item of byId.values()) {
    if (item.parentId === null) roots.push(item);
    else byId.get(item.parentId)?.children.push(item);
  }
  if (roots.length !== 1) return { byId, order, generations: 0 };
  roots[0].generation = 1;
  order.push(roots[0]);
  let generations = 1;
  for (const node of order) {
    node.children.forEach((child, index) => {
      child.generation = node.generation + 1;
      child.tone = node.generation === 1 ? branchTones[index % branchTones.length] : node.tone;
      order.push(child);
      generations = Math.max(generations, child.generation);
    });
  }
  return { byId, order, generations };
}

let members = [];
let revision = 0;
let editor = false;
let ready = false;
let loading = false;
let saving = false;
let connectionError = false;
let previousTree = [];
let sessionEpoch = 0;
let sessionBusy = false;
let pendingDeletion = null;
let data;
let selectedId = null;
let chosenParent = null;
let editingId = null;
let blockedParents = new Set();
let collapsed = new Set();
let toastTimer;

const viewport = $("tree-viewport");
const stage = $("tree-stage");
const sizer = $("tree-sizer");
const parentButton = $("parent-button");
const parentMenu = $("parent-menu");
const parentSearch = $("parent-search");
const treeSearch = $("tree-search");
const treeResults = $("tree-results");
const nameInput = $("person-name");
const formError = $("form-error");
const adminDialog = $("admin-dialog");
const passwordInput = $("admin-password");
const deleteDialog = $("delete-dialog");

const nodeWidth = 148;
const nodeHeight = 60;
const rowStep = 106;
const offsetTop = 57;
const baseMargin = 16;
const leafStep = 165;
const nodeButtons = new Map();
const toggleButtons = new Map();
const generationLabels = new Map();
let graph = { width: 0, height: 0, positions: new Map() };
let scale = 1;
let stageLeft = 0;
let autoFit = true;

function layoutTree() {
  const root = data.order[0];
  const visible = [];
  const stack = [root];
  let maxGeneration = 1;
  while (stack.length) {
    const node = stack.pop();
    visible.push(node);
    maxGeneration = Math.max(maxGeneration, node.generation);
    if (!collapsed.has(node.id)) {
      for (let index = node.children.length - 1; index >= 0; index--) stack.push(node.children[index]);
    }
  }

  const positions = new Map();
  let leaf = 0;
  for (let index = visible.length - 1; index >= 0; index--) {
    const node = visible[index];
    const first = positions.get(node.children[0]?.id);
    const last = positions.get(node.children.at(-1)?.id);
    const center = first && last ? (first.x + last.x) / 2 : leaf++ * leafStep;
    positions.set(node.id, { x: center, y: offsetTop + (node.generation - 1) * rowStep, node });
  }
  const edge = baseMargin + nodeWidth / 2;
  for (const position of positions.values()) position.x = (leaf - 1) * leafStep - position.x + edge;
  return {
    width: (leaf - 1) * leafStep + 2 * edge,
    height: offsetTop + (maxGeneration - 1) * rowStep + nodeHeight + 43,
    positions,
    maxGeneration
  };
}

function drawConnections(positions) {
  const namespace = "http://www.w3.org/2000/svg";
  const lines = document.createElementNS(namespace, "svg");
  lines.classList.add("connectors");
  lines.setAttribute("aria-hidden", "true");
  lines.style.width = graph.width + "px";
  lines.style.height = graph.height + "px";
  const segments = new Map();
  for (const entry of positions.values()) {
    const parent = positions.get(entry.node.parentId);
    if (!parent) continue;
    const start = parent.y + nodeHeight;
    const middle = (start + entry.y) / 2 + 3;
    const path = "M" + parent.x + "," + start + " V" + middle + " H" + entry.x + " V" + entry.y;
    if (!segments.has(entry.node.tone)) segments.set(entry.node.tone, []);
    segments.get(entry.node.tone).push(path);
  }
  for (const [tone, parts] of segments) {
    const path = document.createElementNS(namespace, "path");
    path.setAttribute("d", parts.join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", toneEdges[tone]);
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linejoin", "round");
    lines.append(path);
  }
  return lines;
}

function initials(name) {
  const words = name.split(" ");
  const ending = words.slice(-2).map((word) => Array.from(word)[0]);
  return ending.join("").toLocaleUpperCase("vi");
}

function makeCard({ node, x, y }) {
  const wrapper = document.createElement("div");
  wrapper.className = "member " + node.tone + (node.parentId ? "" : " root");
  Object.assign(wrapper.style, {
    left: (x - nodeWidth / 2) + "px", top: y + "px",
    width: nodeWidth + "px", height: nodeHeight + "px"
  });

  const button = document.createElement("button");
  button.type = "button";
  button.className = "member-card";
  button.setAttribute("aria-pressed", String(node.id === selectedId));
  button.title = node.name;
  button.innerHTML = '<span class="avatar" aria-hidden="true"></span><span class="member-copy"><span class="member-name"></span><span class="member-caption"></span></span>';
  button.querySelector(".avatar").textContent = initials(node.name);
  button.querySelector(".member-name").textContent = node.name;
  button.querySelector(".member-caption").textContent = node.parentId ? "Đời " + node.generation : "Gốc gia phả";
  button.addEventListener("click", () => selectMember(node.id));
  nodeButtons.set(node.id, button);
  wrapper.append(button);

  if (node.children.length > 0) {
    const toggle = document.createElement("button");
    const closed = collapsed.has(node.id);
    toggle.type = "button";
    toggle.className = "branch-toggle";
    toggle.setAttribute("aria-expanded", String(!closed));
    const text = (closed ? "Mở nhánh của " : "Thu gọn nhánh của ") + node.name;
    toggle.setAttribute("aria-label", text);
    toggle.title = text;
    toggle.innerHTML = svg(closed ? "plus" : "minus");
    if (closed) toggle.append(String(node.children.length));
    toggle.addEventListener("click", () => toggleBranch(node.id));
    toggleButtons.set(node.id, toggle);
    wrapper.append(toggle);
  }
  return wrapper;
}

function drawTree() {
  graph = layoutTree();
  nodeButtons.clear();
  toggleButtons.clear();
  generationLabels.clear();
  stage.style.width = graph.width + "px";
  stage.style.height = graph.height + "px";
  const fragment = document.createDocumentFragment();
  fragment.append(drawConnections(graph.positions));
  for (const node of data.order) {
    const position = graph.positions.get(node.id);
    if (position) fragment.append(makeCard(position));
  }
  stage.replaceChildren(fragment);

  const labels = document.createDocumentFragment();
  for (let generation = 1; generation <= graph.maxGeneration && generation <= 30; generation++) {
    const label = document.createElement("span");
    label.className = "generation-label";
    label.textContent = "Đời " + generation;
    generationLabels.set(generation, label);
    labels.append(label);
  }
  $("generation-labels").replaceChildren(labels);
  if (autoFit) scale = fitScale();
  sizeGraph();
}

function fitScale() {
  const gutter = viewport.clientWidth > 850 ? 94 : 10;
  return Math.max(.7, Math.min(1, (viewport.clientWidth - gutter) / graph.width,
    (viewport.clientHeight - 2) / graph.height));
}

function sizeGraph() {
  const labelGutter = viewport.clientWidth > 850 ? 55 : 0;
  $("generation-labels").hidden = !labelGutter;
  const scaledWidth = graph.width * scale;
  stageLeft = Math.max(labelGutter, (viewport.clientWidth - scaledWidth) / 2);
  const width = Math.max(viewport.clientWidth, Math.ceil(stageLeft + scaledWidth));
  sizer.style.width = width + "px";
  sizer.style.height = Math.max(viewport.clientHeight, Math.ceil(graph.height * scale)) + "px";
  stage.style.left = stageLeft + "px";
  stage.style.transform = "scale(" + scale + ")";
  $("zoom-value").textContent = Math.round(scale * 100) + "%";
  $("zoom-out").disabled = scale <= .3;
  $("zoom-in").disabled = scale >= 1.65;
  syncLabels();
}

function syncLabels() {
  for (const [generation, label] of generationLabels) {
    const y = offsetTop + (generation - 1) * rowStep + nodeHeight / 2;
    label.style.top = (y * scale - viewport.scrollTop) + "px";
  }
}

function centerOn(id, horizontalOnly = false) {
  const position = graph.positions.get(id);
  if (!position) return;
  viewport.scrollLeft = stageLeft + position.x * scale - viewport.clientWidth / 2;
  if (!horizontalOnly) {
    viewport.scrollTop = (position.y + nodeHeight / 2) * scale - viewport.clientHeight / 2;
  }
}

function zoomBy(delta) {
  const centerX = (viewport.scrollLeft + viewport.clientWidth / 2 - stageLeft) / scale;
  const centerY = (viewport.scrollTop + viewport.clientHeight / 2) / scale;
  autoFit = false;
  scale = Math.max(.3, Math.min(1.65, Math.round((scale + delta) * 100) / 100));
  sizeGraph();
  viewport.scrollLeft = stageLeft + centerX * scale - viewport.clientWidth / 2;
  viewport.scrollTop = centerY * scale - viewport.clientHeight / 2;
}

function toggleBranch(id) {
  if (collapsed.has(id)) collapsed.delete(id);
  else collapsed.add(id);
  autoFit = false;
  drawTree();
  const selected = selectedId && graph.positions.has(selectedId) ? selectedId : id;
  selectMember(selected);
  centerOn(id);
  toggleButtons.get(id)?.focus({ preventScroll: true });
}

function revealMember(id) {
  for (let parent = data.byId.get(id)?.parentId; parent; parent = data.byId.get(parent)?.parentId) {
    collapsed.delete(parent);
  }
}

function selectMember(id) {
  nodeButtons.get(selectedId)?.setAttribute("aria-pressed", "false");
  selectedId = id;
  nodeButtons.get(selectedId)?.setAttribute("aria-pressed", "true");
  renderDetails();
}

function renderDetails() {
  const person = data.byId.get(selectedId);
  $("member-detail").hidden = !person;
  $("sample-info").hidden = !ready || !!person || !!members.length;
  $("detail-actions").hidden = !editor || !members.length;
  if (!person) return;
  $("detail-name").textContent = person.name;
  $("detail-avatar").textContent = initials(person.name);
  $("detail-avatar").className = "avatar " + person.tone;
  $("detail-generation").textContent = "Đời " + person.generation;
  $("detail-parent").textContent = data.byId.get(person.parentId)?.name ?? "Gốc gia phả";
  $("detail-children").textContent = person.children.length;
}

function normalize(text) {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/đ/g, "d");
}

function matchingPeople(people, query) {
  const keywords = normalize(query.trim()).split(/\s+/);
  return people.filter((person) => {
    const name = normalize(person.name);
    return keywords.every((word) => name.includes(word));
  });
}

function fillResults(element, people, onChoose, current = null) {
  const rows = document.createDocumentFragment();
  for (const person of people) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.personId = person.id;
    if (current) button.setAttribute("aria-pressed", String(current === person.id));
    const name = document.createElement("span");
    name.className = "result-name";
    name.textContent = person.name;
    const detail = document.createElement("span");
    detail.className = "result-meta";
    const parent = data.byId.get(person.parentId);
    detail.textContent = "Đời " + person.generation + (parent ? " · Con của " + parent.name : " · Gốc gia phả");
    button.append(name, detail);
    button.addEventListener("click", () => onChoose(person.id));
    rows.append(button);
  }
  if (!people.length) {
    const empty = document.createElement("p");
    empty.className = "no-results";
    empty.textContent = "Không tìm thấy thành viên.";
    rows.append(empty);
  }
  element.replaceChildren(rows);
}

function refreshParentResults() {
  const candidates = data.order.filter((person) => !blockedParents.has(person.id));
  fillResults($("parent-results"), matchingPeople(candidates, parentSearch.value), (id) => {
    chosenParent = id;
    updateParentValue();
    formError.hidden = true;
    closeParentMenu(true);
  }, chosenParent);
}

function openParentMenu() {
  parentMenu.hidden = false;
  parentButton.setAttribute("aria-expanded", "true");
  parentSearch.value = "";
  refreshParentResults();
  parentSearch.focus();
}

function closeParentMenu(focusButton = false) {
  parentMenu.hidden = true;
  parentButton.setAttribute("aria-expanded", "false");
  if (focusButton) parentButton.focus();
}

function chooseFromTree(id) {
  treeResults.hidden = true;
  selectMember(id);
  revealMember(id);
  drawTree();
  centerOn(id);
  nodeButtons.get(id)?.focus({ preventScroll: true });
}

function refreshTreeResults() {
  if (!treeSearch.value.trim()) {
    treeResults.hidden = true;
    return;
  }
  fillResults(treeResults, matchingPeople(data.order, treeSearch.value), chooseFromTree);
  treeResults.hidden = false;
}

function updateParentValue() {
  const root = !members.length || (editingId && data.byId.get(editingId)?.parentId === null);
  parentButton.disabled = !!root;
  $("parent-required").hidden = !!root;
  $("parent-value").textContent = root ? "Người ở gốc cây" : data.byId.get(chosenParent)?.name ?? "Chọn cha hoặc mẹ";
  $("parent-help").textContent = root
    ? "Người đầu tiên là gốc của cây gia phả."
    : "Chọn một người đã có trong cây.";
}

function renderForm() {
  $("form-heading").textContent = editingId ? "Sửa thành viên" : "Thêm thành viên";
  $("form-icon").innerHTML = svg(editingId ? "edit" : "user-plus");
  $("submit-text").textContent = editingId ? "Lưu thay đổi" : "Thêm vào cây";
  $("submit-icon").innerHTML = svg(editingId ? "check" : "plus");
  $("cancel-edit").hidden = !editingId;
  updateParentValue();
}

function resetForm() {
  closeParentMenu();
  editingId = null;
  chosenParent = null;
  blockedParents = new Set();
  nameInput.value = "";
  formError.hidden = true;
  renderForm();
}

function familyBranch(person) {
  const people = [person];
  for (const item of people) {
    for (const child of item.children) people.push(child);
  }
  return people;
}

function editSelected() {
  const person = data?.byId.get(selectedId);
  if (!editor || saving || !person || !members.length) return;
  resetForm();
  editingId = person.id;
  chosenParent = person.parentId;
  nameInput.value = person.name;
  blockedParents = new Set(familyBranch(person).map((member) => member.id));
  renderForm();
  nameInput.focus();
  nameInput.select();
}

function renderPage(focusId) {
  const sample = members.length === 0;
  data = indexMembers(sample ? demo : members);
  if (!data.byId.has(selectedId)) selectedId = null;
  if (focusId) {
    selectedId = focusId;
    revealMember(focusId);
  }
  $("sample-badge").hidden = !sample;
  $("chart-description").textContent = sample
    ? "Cây mẫu minh họa quan hệ giữa các thế hệ."
    : "Chọn một người để xem thông tin và nhánh của họ.";
  $("member-count").textContent = data.order.length;
  $("generation-count").textContent = data.generations;
  $("branch-count").textContent = data.order[0].children.length;
  drawTree();
  renderDetails();
  renderForm();
  centerOn(focusId ?? selectedId ?? data.order[0].id, !focusId);
}

function updatePanels() {
  $("form-panel").hidden = !editor || !ready;
  $("view-panel").hidden = editor && !connectionError;
  $("manage-link").hidden = editor;
  $("manage-link").disabled = !ready;
  $("logout-admin").hidden = !editor;
  $("logout-admin").disabled = sessionBusy || saving;
  $("retry-tree").hidden = !connectionError;
  $("view-note").textContent = connectionError
    ? "Tạm thời chưa tải được cây dùng chung. Bạn có thể thử lại."
    : !ready ? "Đang tải cây gia phả…" : members.length
      ? "Bấm vào một người trên sơ đồ để xem cha mẹ và con của họ."
      : "Chủ cây chưa thêm thành viên. Bạn có thể xem trước sơ đồ mẫu.";
  $("tree-search").disabled = !ready;
  $("zoom-tools").hidden = !ready;
  $("save-member").disabled = saving;
  $("import-tree").disabled = saving;
  $("import-panel").hidden = !editor || revision !== 0 || !previousTree.length;
  if (!$("import-panel").hidden) {
    $("import-description").textContent = "Trình duyệt này có cây đã nhập gồm " + previousTree.length +
      " thành viên. Khi đưa lên, mọi người có đường dẫn đều xem được tên và quan hệ trong cây.";
  }
}

function updateEditMode(allowed) {
  if (allowed && !editor) previousTree = readPreviousTree();
  editor = allowed;
  if (data) renderDetails();
  updatePanels();
}

function applySnapshot(snapshot, focusId) {
  const redraw = !ready || revision !== snapshot.revision || editor !== snapshot.canEdit || focusId;
  if (!!members.length !== !!snapshot.members.length) {
    collapsed.clear();
    selectedId = null;
    autoFit = true;
  }
  members = snapshot.members;
  revision = snapshot.revision;
  ready = true;
  connectionError = false;
  updateEditMode(snapshot.canEdit);
  if (redraw) renderPage(focusId);
}

async function refreshTree() {
  if (loading || saving) return;
  loading = true;
  const epoch = sessionEpoch;
  try {
    const response = await fetch("/api/tree", { cache: "no-store" });
    if (!response.ok) throw new Error("Không tải được cây");
    const snapshot = await response.json();
    if (epoch === sessionEpoch && !saving && snapshot.revision >= revision) applySnapshot(snapshot);
  } catch {
    if (epoch !== sessionEpoch) return;
    connectionError = true;
    updatePanels();
    if (!ready) $("chart-description").textContent = "Chưa tải được cây dùng chung.";
  } finally {
    loading = false;
  }
}

async function persistTree(next) {
  saving = true;
  updatePanels();
  try {
    const response = await fetch("/api/tree", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ revision, members: next })
    });
    if (response.ok) return { snapshot: await response.json() };
    if (response.status === 409) return {
      conflict: true,
      error: "Cây đã thay đổi ở một thiết bị khác. Kiểm tra cây mới tải rồi thử lại."
    };
    if (response.status === 403) {
      sessionEpoch++;
      updateEditMode(false);
      notify("Phiên đã hết. Chọn Quản lý cây để mở khóa lại.");
      return { error: "Phiên đã hết. Hãy mở khóa lại để tiếp tục." };
    }
    if (response.status === 400) return { error: "Tên hoặc quan hệ trong cây chưa hợp lệ." };
    if (response.status === 413) return { error: "Cây vượt dung lượng cho phép." };
    return { error: "Chưa lưu được cây dùng chung. Bạn hãy thử lại." };
  } catch {
    return { error: "Chưa xác nhận được lần lưu. Hãy tải lại và kiểm tra sơ đồ trước khi thử lại." };
  } finally {
    saving = false;
    updatePanels();
  }
}

async function importTree() {
  if (!editor || revision !== 0 || !previousTree.length || saving) return;
  const error = $("import-error");
  error.hidden = true;
  const result = await persistTree(previousTree);
  if (result.error) {
    if (result.conflict) {
      await refreshTree();
      notify("Cây dùng chung đã có dữ liệu. Cây trong trình duyệt vẫn được giữ.");
    } else {
      error.textContent = result.error;
      error.hidden = false;
    }
    return;
  }
  applySnapshot(result.snapshot);
  resetForm();
  notify("Đã đưa cây gia phả lên trang dùng chung.");
}

function openAdminDialog() {
  if (editor || sessionBusy) return;
  passwordInput.value = "";
  $("admin-error").hidden = true;
  adminDialog.showModal();
}

async function unlockAdmin(event) {
  event.preventDefault();
  if (sessionBusy || !passwordInput.value) return;
  sessionBusy = true;
  const error = $("admin-error");
  error.hidden = true;
  $("unlock-admin").disabled = true;
  $("cancel-admin").disabled = true;
  try {
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: passwordInput.value })
    });
    if (response.ok) {
      passwordInput.value = "";
      sessionEpoch++;
      updateEditMode(true);
      adminDialog.close();
      nameInput.focus({ preventScroll: true });
      notify("Đã mở khóa quản lý cây.");
      refreshTree();
      return;
    }
    error.textContent = response.status === 429
      ? "Đã thử quá nhiều lần. Hãy thử lại sau ít phút."
      : response.status === 401 || response.status === 400
        ? "Mật khẩu chưa đúng."
        : "Chưa mở khóa được. Bạn hãy thử lại.";
  } catch {
    error.textContent = "Chưa kết nối được. Bạn hãy thử lại.";
  } finally {
    sessionBusy = false;
    $("unlock-admin").disabled = false;
    $("cancel-admin").disabled = false;
    updatePanels();
  }
  error.hidden = false;
  passwordInput.select();
}

async function lockAdmin() {
  if (saving || sessionBusy) return;
  sessionBusy = true;
  updatePanels();
  try {
    const response = await fetch("/api/admin/session", { method: "DELETE" });
    if (!response.ok) throw new Error("Không thể thoát");
    sessionEpoch++;
    updateEditMode(false);
    if (data) resetForm();
    notify("Đã thoát quản lý cây.");
  } catch {
    notify("Chưa thoát được. Bạn hãy thử lại.");
  } finally {
    sessionBusy = false;
    updatePanels();
  }
}

function askToDelete() {
  const person = data?.byId.get(selectedId);
  if (!editor || saving || !person || !members.length) return;
  const branch = familyBranch(person);
  const descendants = branch.length - 1;
  pendingDeletion = {
    revision, parentId: person.parentId, ids: new Set(branch.map((member) => member.id))
  };
  $("delete-dialog-title").textContent = descendants ? "Xóa cả nhánh" : "Xóa thành viên";
  $("delete-description").textContent = descendants
    ? "Bạn sắp xóa " + person.name + " và " + descendants + " người thuộc nhánh này khỏi cây dùng chung."
    : "Bạn sắp xóa " + person.name + " khỏi cây dùng chung.";
  $("confirm-delete").textContent = descendants ? "Xóa cả nhánh" : "Xóa thành viên";
  $("confirm-delete").disabled = false;
  $("delete-error").hidden = true;
  deleteDialog.showModal();
}

async function removeSelectedBranch(event) {
  event.preventDefault();
  if (!editor || saving || !pendingDeletion) return;
  const target = pendingDeletion;
  const error = $("delete-error");
  error.hidden = true;
  $("cancel-delete").disabled = true;
  $("confirm-delete").disabled = true;
  const result = target.revision === revision
    ? await persistTree(members.filter((member) => !target.ids.has(member.id)))
    : { conflict: true };
  $("cancel-delete").disabled = false;
  if (result.snapshot) {
    deleteDialog.close();
    selectedId = null;
    applySnapshot(result.snapshot, target.parentId);
    resetForm();
    notify(target.ids.size === 1 ? "Đã xóa thành viên." : "Đã xóa " + target.ids.size + " thành viên trong nhánh.");
    return;
  }
  if (result.conflict) {
    pendingDeletion = null;
    await refreshTree();
    error.textContent = "Cây đã thay đổi. Hãy đóng khung này và chọn lại người cần xóa.";
  } else {
    error.textContent = result.error;
    $("confirm-delete").disabled = !editor;
  }
  error.hidden = false;
}

function notify(message) {
  clearTimeout(toastTimer);
  $("toast-text").textContent = message;
  $("toast").hidden = false;
  toastTimer = setTimeout(() => { $("toast").hidden = true; }, 3000);
}

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

async function saveMember(event) {
  event.preventDefault();
  if (!editor || !ready || saving) return;
  formError.hidden = true;
  if (editingId && !data.byId.has(editingId)) {
    showError("Thành viên này đã bị xóa. Hãy hủy chỉnh sửa để tiếp tục.");
    return;
  }
  const name = nameInput.value.trim().replace(/\s+/g, " ");
  if (!name) {
    showError("Bạn hãy nhập họ và tên.");
    nameInput.focus();
    return;
  }
  if (!parentButton.disabled && (!data.byId.has(chosenParent) || blockedParents.has(chosenParent))) {
    showError("Bạn hãy chọn người là cha hoặc mẹ.");
    parentButton.focus();
    return;
  }

  const id = editingId ?? (globalThis.crypto?.randomUUID?.() ?? "tv-" + Date.now() + "-" + Math.random().toString(36).slice(2));
  const record = { id, name, parentId: parentButton.disabled ? null : chosenParent };
  const next = editingId ? members.map((item) => item.id === id ? record : item) : [...members, record];
  const wasEditing = !!editingId;
  const result = await persistTree(next);
  if (result.error) {
    if (result.conflict) await refreshTree();
    showError(result.error);
    return;
  }

  applySnapshot(result.snapshot, id);
  resetForm();
  treeSearch.value = "";
  treeResults.hidden = true;
  notify(wasEditing ? "Đã lưu thay đổi." : "Đã thêm " + name + " vào cây.");
  if (matchMedia("(max-width: 760px)").matches) viewport.scrollIntoView({ block: "nearest", behavior: "instant" });
}

function handleSearchKeys(event, results, onEscape) {
  if (event.key === "Escape") {
    event.preventDefault();
    onEscape();
  }
  if (event.key === "ArrowDown" || event.key === "Enter") {
    const first = results.querySelector("button");
    if (!first) return;
    event.preventDefault();
    if (event.key === "Enter") first.click();
    else first.focus();
  }
}

function handleResultKeys(event, search, onEscape) {
  if (event.key === "Escape") {
    event.preventDefault();
    onEscape();
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const next = event.key === "ArrowDown" ? event.target.nextElementSibling : event.target.previousElementSibling ?? search;
    next?.focus();
  }
}

$("member-form").addEventListener("submit", saveMember);
$("manage-link").addEventListener("click", openAdminDialog);
$("admin-form").addEventListener("submit", unlockAdmin);
$("cancel-admin").addEventListener("click", () => adminDialog.close());
adminDialog.addEventListener("cancel", (event) => { if (sessionBusy) event.preventDefault(); });
adminDialog.addEventListener("close", () => { passwordInput.value = ""; });
$("logout-admin").addEventListener("click", lockAdmin);
$("delete-member").addEventListener("click", askToDelete);
$("delete-form").addEventListener("submit", removeSelectedBranch);
$("cancel-delete").addEventListener("click", () => deleteDialog.close());
deleteDialog.addEventListener("cancel", (event) => { if (saving) event.preventDefault(); });
deleteDialog.addEventListener("close", () => { pendingDeletion = null; });
$("import-tree").addEventListener("click", importTree);
$("retry-tree").addEventListener("click", refreshTree);
$("cancel-edit").addEventListener("click", resetForm);
$("edit-member").addEventListener("click", editSelected);
$("add-child").addEventListener("click", () => {
  if (!editor || saving || !members.length || !selectedId) return;
  resetForm();
  chosenParent = selectedId;
  updateParentValue();
  nameInput.focus();
});
parentButton.addEventListener("click", () => {
  if (parentMenu.hidden) openParentMenu();
  else closeParentMenu(true);
});
parentSearch.addEventListener("input", refreshParentResults);
parentSearch.addEventListener("keydown", (event) => {
  if (event.key === "Enter") event.preventDefault();
  handleSearchKeys(event, $("parent-results"), () => closeParentMenu(true));
});
$("parent-results").addEventListener("keydown", (event) => {
  handleResultKeys(event, parentSearch, () => closeParentMenu(true));
});
treeSearch.addEventListener("input", refreshTreeResults);
treeSearch.addEventListener("focus", refreshTreeResults);
treeSearch.addEventListener("keydown", (event) => {
  if (!treeResults.hidden) handleSearchKeys(event, treeResults, () => { treeResults.hidden = true; });
});
treeResults.addEventListener("keydown", (event) => {
  handleResultKeys(event, treeSearch, () => {
    treeSearch.focus();
    treeResults.hidden = true;
  });
});
document.addEventListener("focusin", (event) => {
  if (!event.target.closest(".picker")) closeParentMenu();
  if (!event.target.closest(".chart-search")) treeResults.hidden = true;
});
document.addEventListener("pointerdown", (event) => {
  if (!event.target.closest(".picker")) closeParentMenu();
  if (!event.target.closest(".chart-search")) treeResults.hidden = true;
});

$("zoom-out").addEventListener("click", () => zoomBy(-.15));
$("zoom-in").addEventListener("click", () => zoomBy(.15));
$("zoom-fit").addEventListener("click", () => {
  autoFit = true;
  scale = fitScale();
  sizeGraph();
  viewport.scrollTop = 0;
  centerOn(data.order[0].id, true);
});
viewport.addEventListener("scroll", syncLabels, { passive: true });
let drag;
viewport.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse" || event.button !== 0 || event.target.closest("button")) return;
  if (event.clientX >= viewport.getBoundingClientRect().left + viewport.clientWidth ||
      event.clientY >= viewport.getBoundingClientRect().top + viewport.clientHeight) return;
  drag = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  viewport.setPointerCapture(event.pointerId);
  viewport.classList.add("dragging");
});
viewport.addEventListener("pointermove", (event) => {
  if (!drag) return;
  viewport.scrollLeft = drag.left + drag.x - event.clientX;
  viewport.scrollTop = drag.top + drag.y - event.clientY;
});
viewport.addEventListener("lostpointercapture", () => {
  drag = null;
  viewport.classList.remove("dragging");
});

new ResizeObserver(() => {
  if (!data) return;
  if (autoFit) scale = fitScale();
  sizeGraph();
  if (autoFit) centerOn(selectedId ?? data.order[0].id, true);
}).observe(viewport);

function refreshWhileViewing() {
  if (!document.hidden && !sessionBusy && !deleteDialog.open && (!editor || (!editingId && !nameInput.value))) refreshTree();
}

window.addEventListener("focus", refreshWhileViewing);
document.addEventListener("visibilitychange", refreshWhileViewing);
setInterval(refreshWhileViewing, 30000);
refreshTree();
