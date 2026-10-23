/* Flow List — community.obsidian.md-style directory for AssistBox .flow
 * packages. Static: registry JSON + per-entry manifest.yaml/README.md read
 * from the entry's repo over raw.githubusercontent.com. */
"use strict";

const REGISTRY_URL = "community-flows.json";

const state = { flows: [], sort: "name", query: "" };
const $ = (sel) => document.querySelector(sel);

function rawBase(entry) {
  const path = (entry.path || "").replace(/^\/+|\/+$/g, "");
  return `https://raw.githubusercontent.com/${entry.repo}/HEAD/` +
    (path ? path + "/" : "");
}
function repoUrl(entry) {
  return `https://github.com/${entry.repo}` +
    (entry.path ? `/tree/HEAD/${entry.path}` : "");
}

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.text();
}

function parseManifest(text) {
  if (window.jsyaml) {
    try { return window.jsyaml.load(text); } catch (_) { /* fall through */ }
  }
  // No js-yaml (offline CDN): scrape the scalar fields we display.
  const pick = (k) => {
    const m = text.match(new RegExp(`^${k}:\\s*"?([^"\\n]+)"?\\s*$`, "m"));
    return m && m[1];
  };
  return { name: pick("name"), description: pick("description") };
}

function renderMarkdown(text) {
  if (window.marked && window.DOMPurify) {
    return window.DOMPurify.sanitize(window.marked.parse(text));
  }
  const pre = document.createElement("pre");
  pre.textContent = text;
  return pre.outerHTML;
}

function triggerLabel(manifest) {
  const t = manifest && manifest.trigger;
  if (!t || typeof t !== "object") return "—";
  if (t.every) return `每 ${t.every}`;
  if (t.at) return `定时 ${t.at}`;
  if (t.on) return `信号 on:${t.on}`;
  return JSON.stringify(t);
}

function matches(flow, q) {
  const hay = [flow.id, flow.name, flow.author, flow.description,
    ...(flow.tags || [])].join("\n").toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

function renderGrid() {
  const grid = $("#grid");
  grid.textContent = "";
  const flows = state.flows
    .filter((f) => matches(f, state.query))
    .sort((a, b) => (a[state.sort] || "").localeCompare(b[state.sort] || ""));
  $("#count").textContent =
    `${flows.length} 个 flow` + (state.query ? ` · “${state.query}”` : "");
  $("#empty").hidden = flows.length > 0;
  for (const f of flows) {
    const card = document.createElement("a");
    card.className = "card";
    card.href = `#flow/${f.id}`;
    card.setAttribute("role", "listitem");
    card.innerHTML = `
      <h3></h3>
      <div class="author"></div>
      <p></p>
      <div class="tags"></div>`;
    card.querySelector("h3").textContent = f.name || f.id;
    card.querySelector(".author").textContent = f.author || "";
    card.querySelector("p").textContent = f.description || "";
    const tags = card.querySelector(".tags");
    for (const t of f.tags || []) {
      const el = document.createElement("span");
      el.className = "tag";
      el.textContent = t;
      tags.append(el);
    }
    grid.append(card);
  }
}

async function openDetail(flow) {
  $("#d-name").textContent = flow.name || flow.id;
  $("#d-meta").textContent = `${flow.author || "未知作者"} · ${flow.repo}` +
    (flow.path ? `/${flow.path}` : "");
  const tags = $("#d-tags");
  tags.textContent = "";
  for (const t of flow.tags || []) {
    const el = document.createElement("span");
    el.className = "tag";
    el.textContent = t;
    tags.append(el);
  }
  $("#d-source").href = repoUrl(flow);
  const manifestBox = $("#d-manifest");
  const readmeBox = $("#d-readme");
  manifestBox.textContent = "读取 manifest…";
  readmeBox.textContent = "";
  $("#detail-backdrop").hidden = false;
  document.body.style.overflow = "hidden";

  const base = rawBase(flow);
  try {
    const manifest = parseManifest(await fetchText(base + "manifest.yaml"));
    const steps = Array.isArray(manifest.steps) ? manifest.steps : [];
    const stepNames = steps
      .map((s) => (s && s.tool ? `tool:${s.tool}` : s && s.js ? `js:${s.js}` : "?"))
      .join(" → ");
    manifestBox.innerHTML = `<table>
      <tr><td>触发</td><td>${triggerLabel(manifest)}</td></tr>
      <tr><td>步骤</td><td>${steps.length} 步<br><code>${stepNames}</code></td></tr>
      <tr><td>策略</td><td><code>onStepError=${manifest.context?.onStepError ?? "—"}</code>
        <code>maxFires=${manifest.context?.maxFires ?? "—"}</code></td></tr>
      <tr><td>版本</td><td>${flow.version ?? "—"}${flow.minApp ? ` · 要求 app ≥ ${flow.minApp}` : ""}</td></tr>
      ${flow.capabilities?.length ? `<tr><td>能力</td><td>${flow.capabilities.map((c) => `<code>${c}</code>`).join(" ")}</td></tr>` : ""}
      <tr><td>安装</td><td>${flow.distUrl ? `<a href="${flow.distUrl}" target="_blank" rel="noopener">下载 .flow</a>，` : ""}放入 workspace 后
        <code>flow.import {"path":"<file>.flow"}</code>，或直接让 Agent 导入。</td></tr>
    </table>`;
  } catch (e) {
    manifestBox.textContent = "manifest.yaml 读取失败：" + e.message;
  }
  try {
    readmeBox.innerHTML = renderMarkdown(await fetchText(base + "README.md"));
  } catch (_) {
    readmeBox.textContent = "";
  }
}

function closeDetail() {
  $("#detail-backdrop").hidden = true;
  document.body.style.overflow = "";
  if (location.hash.startsWith("#flow/")) history.pushState(null, "", location.pathname);
}

function route() {
  const m = location.hash.match(/^#flow\/(.+)$/);
  if (!m) return;
  const flow = state.flows.find((f) => f.id === decodeURIComponent(m[1]));
  if (flow) openDetail(flow);
}

async function main() {
  try {
    state.flows = await (await fetch(REGISTRY_URL)).json();
  } catch (e) {
    $("#empty").hidden = false;
    $("#empty").textContent = "community-flows.json 加载失败：" + e.message;
    return;
  }
  renderGrid();
  route();

  const search = $("#search");
  search.addEventListener("input", () => {
    state.query = search.value.trim();
    renderGrid();
  });
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      search.focus();
    }
    if (e.key === "/" && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
    if (e.key === "Escape") closeDetail();
  });
  for (const btn of document.querySelectorAll(".sort-btn")) {
    btn.addEventListener("click", () => {
      document.querySelector(".sort-btn.active").classList.remove("active");
      btn.classList.add("active");
      state.sort = btn.dataset.sort;
      renderGrid();
    });
  }
  $("#d-close").addEventListener("click", closeDetail);
  $("#detail-backdrop").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeDetail();
  });
  window.addEventListener("hashchange", route);
}

main();
