/* Flow sandbox — runs a manifest's steps in the browser with a synchronous
 * `ct` mock matching the in-app ABI. Tool steps execute in order before the
 * js entry; the cell view renders against a simulated `flow` context
 * (lastFire/fires/nextFireAtText). CORS still bounds net.fetch — same as the
 * app, which proxies it through the workspace net.fetch leg. */
const $ = (s) => document.querySelector(s);
let flows = [], manifest = null, mods = {}, cellView = null;

const RAW = (f) =>
  `https://raw.githubusercontent.com/${f.repo}/HEAD/` +
  ((f.path || "").replace(/^\/+|\/+$/g, "") + "/");

/* Synchronous ct mock. tool.call mirrors the app: fs.* are workspace-jailed
 * in-memory, storage.kv seeds from the KV field, net.fetch goes through sync
 * XHR (deprecated but the only sync HTTP in a page — the app's own fetch is
 * sync to scripts). log.write appends. */
function makeCt(log, kvSeed) {
  const files = {}, kv = { ...(kvSeed || {}) };
  const ct = {
    tool: {
      call: (name, a = {}) => {
        switch (name) {
          case "fs.read": return { text: files[a.path] ?? "", ok: a.path in files };
          case "fs.write": files[a.path] = a.text ?? ""; return { ok: true };
          case "fs.delete": delete files[a.path]; return { ok: true };
          case "fs.list":
            return { entries: Object.keys(files).filter((p) => p.startsWith(a.path ?? "")) };
          case "storage.set": kv[a.key] = a.value ?? ""; return { ok: true };
          case "storage.get": return { value: kv[a.key] ?? "", ok: a.key in kv };
          case "storage.kv.get": return kv[a.key] ?? "";
          case "net.fetch": {
            try {
              const xhr = new XMLHttpRequest();
              xhr.open("GET", a.url, false); // sync — sandbox only
              xhr.send(null);
              if (a.path) files[a.path] = xhr.responseText;
              log(`net.fetch ${a.url} → ${xhr.status}`);
              return { ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, sha256: null };
            } catch (e) {
              log(`net.fetch ${a.url} → 失败 ${e.message}`);
              return { ok: false, status: 0, error: e.message };
            }
          }
          case "log.write": log(`${a.level ?? "info"} ${a.text ?? ""}`); return { ok: true };
          default: log(`tool ${name} 未模拟 → ok`); return { ok: true };
        }
      },
    },
    storage: {
      kv: { get: (k) => kv[k] ?? "", set: (k, v) => { kv[k] = String(v); } },
      n: { get: (k) => kv[k] ?? "", set: (k, v) => { kv[k] = String(v); } },
    },
    context: { runId: "sandbox", principal: "home" },
    files, kv,
  };
  return ct;
}

async function loadFlow(id) {
  const f = flows.find((x) => x.id === id);
  const base = RAW(f);
  manifest = jsyaml.load(await (await fetch(base + "manifest.yaml")).text());
  mods = {};
  for (const p of manifest.import || ["scripts/main.js"]) {
    const src = await (await fetch(base + p)).text();
    const name = p.replace(/^scripts\//, "").replace(/\.js$/, "");
    // Sandbox ABI: script text is a module body ending in `return {...}`.
    const m = new Function("ct", src)(makeCt(() => {}));
    if (m) mods[name] = m;
  }
  cellView = manifest.flowView?.cell
    ? await fetch(base + manifest.flowView.cell)
        .then(async (r) => (r.ok ? jsyaml.load(await r.text()) : null))
        .catch(() => null)
    : null;
  $("#entry").innerHTML = (manifest.steps || [])
    .map((s, i) => {
      const label = s.js ? `js ${s.js}` : `tool ${s.tool}`;
      return `<option value="${i}">第${i + 1}步 · ${label}</option>`;
    })
    .join("");
  $("#out").textContent = `${f.name} — ${manifest.steps?.length ?? 0} 步`;
}

/* Run manifest steps in order up to (or just) the selected one. js entries
 * are `<module>.<fn>` — ct is module-scoped, args is the only parameter. */
async function run() {
  const logs = [], kvSeed = kvArgs();
  const ct = makeCt((m) => logs.push(m), kvSeed);
  const upto = parseInt($("#entry").value, 10);
  const steps = manifest.steps || [];
  let out = null, signal = null;
  for (let i = 0; i < steps.length && i <= upto; i++) {
    const s = steps[i];
    try {
      if (s.tool) {
        const r = ct.tool.call(s.tool, s.arguments || {});
        logs.push(`步${i + 1} tool.${s.tool} → ${r.ok !== false ? "ok" : "失败"}`);
        if (r && r.ok === false) throw new Error(`${s.tool} 返回失败`);
      } else if (s.js) {
        const [modName, fn] = s.js.split(".");
        const target = mods[modName]?.[fn] ?? Object.values(mods).find((m) => m?.[fn])?.[fn];
        if (typeof target !== "function") throw new Error(`${s.js} 不是函数`);
        out = await target(s.arguments || {});
        logs.push(`步${i + 1} js.${s.js} → ${out?.signal ? `signal:${out.signal}` : "ok"}`);
        if (out?.signal) signal = out.signal;
      }
    } catch (e) {
      $("#out").textContent = logs.concat([`步${i + 1} 失败: ${e.message}`]).join("\n");
      renderCell(null);
      return;
    }
  }
  $("#out").textContent = logs.concat([JSON.stringify(out, null, 2)]).join("\n");
  renderCell(out);
}

function kvArgs() {
  const raw = $("#kvseed").value.trim();
  if (!raw) return {};
  const kv = {};
  for (const line of raw.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) kv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return kv;
}

/* Render the real cell schema: root.column children of banner/progress/
 * text/button, bind paths resolved against a simulated flow context. The
 * js result is exposed as flow.script.* so views can bind render output. */
function renderCell(out) {
  const box = $("#viewcell");
  box.innerHTML = "";
  if (!out || !cellView) return;
  const flow = {
    lastFire: {
      tone: out.error ? "critical" : "success",
      resultText: out.title || out.summary || JSON.stringify(out).slice(0, 60),
      stepsText: `${(manifest.steps || []).length} 步`,
      progressValue: 1,
    },
    fires: 1,
    nextFireAtText: "下一次按 trigger 调度",
    hasLastFire: true,
    script: out,
  };
  const root = cellView.root || cellView;
  const children = root.column?.children || root.children || [];
  const bind = (path) =>
    path.replace(/^flow\./, "").split(".").reduce((o, k) => o?.[k], flow) ?? "";
  const fmt = (tpl, args) =>
    String(tpl).replace(/\{(\d+)\}/g, (_, i) => bind(args[+i] ?? ""));
  const parts = children.map((child) => {
    const [type, node] = Object.entries(child)[0];
    const b = node.bind || {};
    const when = node.when || {};
    if (when.visible !== undefined && !flow[when.visible]) return "";
    switch (type) {
      case "banner": {
        const tone = bind(b.tone) || "info";
        const toneColor = { critical: "#f87171", warning: "#fbbf24", info: "#7dd3fc", success: "#4ade80" }[tone] || "#94a3b8";
        return `<div class="banner" style="border-left:3px solid ${toneColor};padding-left:8px;color:${toneColor}">${bind(b.text)}</div>`;
      }
      case "progress": {
        const v = Math.max(0, Math.min(1, Number(bind(b.value)) || 0));
        return `<div><div class="st">${bind(b.label)}</div><div class="bar"><div style="width:${v * 100}%"></div></div></div>`;
      }
      case "text": {
        const text = node.format ? fmt(node.format, node.args || []) : bind(b.text ?? "text");
        return `<div class="${node.variant === "caption" ? "extra" : "sum"}">${text}</div>`;
      }
      case "button":
        return `<span class="cellbtn">${node.label || "按钮"}</span>`;
      default:
        return `<div class="extra">[${type}]</div>`;
    }
  });
  box.innerHTML = `<div class="cell">${parts.join("")}</div>`;
}

(async () => {
  flows = await (await fetch("community-flows.json")).json();
  $("#flow").innerHTML = flows.map((f) => `<option>${f.id}</option>`).join("");
  $("#flow").onchange = () => loadFlow($("#flow").value);
  $("#run").onclick = run;
  await loadFlow(flows[0].id);
})();
