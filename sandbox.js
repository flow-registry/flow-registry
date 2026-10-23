const $ = (s) => document.querySelector(s);
let flows = [], manifest = null, mod = null, cellView = null;

const RAW = (f) => `https://raw.githubusercontent.com/${f.repo}/HEAD/${f.path || ""}`;

// Mock ct — mirrors the sandbox ABI: tool.call dispatches canned tools,
// storage.kv in-memory. net.fetch proxies real fetch (CORS-bounded).
function makeCt(log) {
  const files = {}, kv = {};
  return {
    tool: { call: async (name, a = {}) => {
      if (name === "fs.read") return { text: files[a.path] ?? "" };
      if (name === "fs.write") { files[a.path] = a.text; return { ok: true }; }
      if (name === "storage.set") { kv[a.key] = a.value; return { ok: true }; }
      if (name === "storage.kv.get") return { value: kv[a.key] ?? "" };
      if (name === "net.fetch") {
        const r = await fetch(a.url); const text = await r.text();
        if (a.path) files[a.path] = text;
        log(`net.fetch ${a.url} → ${r.status}`);
        return { ok: r.ok, status: r.status };
      }
      if (name === "log.write") log(`${a.level ?? "info"} ${a.text}`);
      return { ok: true };
    } },
    storage: { kv: { get: (k) => kv[k] ?? "", set: (k, v) => { kv[k] = v; } } },
    files, kv,
  };
}

async function loadFlow(id) {
  const f = flows.find((x) => x.id === id);
  const base = RAW(f);
  manifest = jsyaml.load(await (await fetch(base + "manifest.yaml")).text());
  const imports = manifest.import || ["scripts/main.js"];
  mod = {};
  for (const p of imports) {
    const src = await (await fetch(base + p)).text();
    // Sandbox ABI: script text is a module body ending in `return {...}`.
    const m = new Function("ct", src)(makeCt(() => {}));
    if (m) Object.assign(mod, m);
  }
  cellView = await fetch(base + (manifest.flowView?.cell || "")).then((r) => r.ok ? jsyaml.load(await r.text()) : null).catch(() => null);
  $("#entry").innerHTML = (manifest.steps || [])
    .filter((s) => s.js).map((s) => `<option>${s.js}</option>`).join("");
}

async function run() {
  const [file, fn] = $("#entry").value.split(".");
  const logs = [];
  const ct = makeCt((m) => logs.push(m));
  const argText = $("#argpath").value.trim();
  let args = {};
  try { args = argText ? JSON.parse(argText) : {}; } catch (e) { $("#out").textContent = "args JSON 无效: " + e.message; return; }
  let out;
  try {
    const target = mod?.[fn];
    if (typeof target !== "function") throw new Error(`${file}.${fn} 不是函数`);
    out = await target(ct, args);
  } catch (e) { $("#out").textContent = "运行失败: " + e.message; renderCell(null); return; }
  $("#out").textContent = logs.concat([JSON.stringify(out, null, 2)]).join("\n");
  renderCell(out);
}

function renderCell(out) {
  const box = $("#viewcell");
  if (!out || !cellView) { box.innerHTML = ""; return; }
  const bind = (path) => path.split(".").reduce((o, k) => o?.[k], out) ?? "";
  const cell = cellView.cell || cellView;
  const binds = cell.bind || cell.bindings || {};
  const series = binds.sparkline ? bind(binds.sparkline) : null;
  const pts = Array.isArray(series) ? series.map(Number).filter((n) => isFinite(n)) : [];
  const spark = pts.length ? sparkline(pts) : "";
  box.innerHTML = `<div class="cell">
    ${binds.status ? `<div class="st">${bind(binds.status)}</div>` : ""}
    <h3>${bind(binds.title ?? "title")}</h3>
    <div class="sum">${bind(binds.summary ?? "summary")}</div>
    ${binds.extra ? `<div class="extra">${bind(binds.extra)}</div>` : ""}
    ${spark}
    ${Array.isArray(out.news) ? `<ul>${out.news.slice(0, 5).map((n) => `<li>${n.title ?? n}</li>`).join("")}</ul>` : ""}
  </div>`;
}

function sparkline(pts) {
  const w = 200, h = 36, min = Math.min(...pts), max = Math.max(...pts), span = max - min || 1;
  const d = pts.map((v, i) => `${i ? "L" : "M"}${(i / (pts.length - 1)) * w},${h - ((v - min) / span) * (h - 4) - 2}`).join(" ");
  return `<svg width="${w}" height="${h}"><path d="${d}" fill="none" stroke="#7dd3fc" stroke-width="1.5"/></svg>`;
}

(async () => {
  flows = await (await fetch("community-flows.json")).json();
  $("#flow").innerHTML = flows.map((f) => `<option>${f.id}</option>`).join("");
  $("#flow").onchange = () => loadFlow($("#flow").value);
  $("#run").onclick = run;
  await loadFlow(flows[0].id);
  $("#out").textContent = "就绪 — 选一个 flow 和入口函数";
})();
