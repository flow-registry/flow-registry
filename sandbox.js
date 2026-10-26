/* Flow sandbox. Tool steps and js modules share one `ct` per run — modules
 * close over `ct`, so they are evaluated at run time, not at load time.
 * Remote packages are read from the release tag pinned in distUrl (raw
 * GitHub, which sends CORS). Drop a .flow to execute the zip bytes. */
"use strict";

const $ = (s) => document.querySelector(s);
const MAX_FETCH = 1_500_000;
const KV_KEY = "flow-sandbox-kv";

let flows = [];
let pkg = null;

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function releaseTag(entry) {
  const m = String(entry?.distUrl || "").match(/\/releases\/download\/([^/]+)\//);
  return m ? m[1] : null;
}
function rawRoot(entry, ref) {
  const path = String(entry.path || "").replace(/^\/+|\/+$/g, "");
  return `https://raw.githubusercontent.com/${entry.repo}/${ref}/` + (path ? path + "/" : "");
}

async function fetchOk(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function makeCt(log, kvSeed) {
  const files = {};
  const kv = { ...(kvSeed || {}) };
  return {
    tool: {
      call: (name, a = {}) => {
        switch (name) {
          case "fs.read":
            return { text: files[a.path] ?? "", ok: a.path in files };
          case "fs.write":
            files[a.path] = String(a.text ?? "");
            return { ok: true };
          case "fs.delete":
            delete files[a.path];
            return { ok: true };
          case "fs.list":
            return { entries: Object.keys(files).filter((p) => p.startsWith(a.path ?? "")) };
          case "storage.set":
            kv[a.key] = a.value ?? "";
            return { ok: true };
          case "storage.get":
            return { value: kv[a.key] ?? "", ok: a.key in kv };
          case "storage.kv.get":
            return kv[a.key] ?? "";
          case "net.fetch": {
            try {
              const xhr = new XMLHttpRequest();
              xhr.open("GET", a.url, false);
              xhr.send(null);
              const body = xhr.responseText || "";
              if (body.length > MAX_FETCH) {
                log(`net.fetch ${a.url} → 超过 ${MAX_FETCH} 字节，丢弃`);
                return { ok: false, status: xhr.status, error: "too large" };
              }
              if (a.path) files[a.path] = body;
              log(`net.fetch ${a.url} → ${xhr.status} · ${body.length}B`);
              return { ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, sha256: null };
            } catch (e) {
              log(`net.fetch ${a.url} → 失败 ${e.message}`);
              return { ok: false, status: 0, error: e.message };
            }
          }
          case "log.write":
            log(`${a.level ?? "info"} ${a.text ?? ""}`);
            return { ok: true };
          default:
            log(`tool ${name} 未模拟 → ok`);
            return { ok: true };
        }
      },
    },
    storage: {
      kv: {
        get: (k) => kv[k] ?? "",
        set: (k, v) => { kv[k] = String(v); },
      },
      n: {
        get: (k) => kv[k] ?? "",
        set: (k, v) => { kv[k] = String(v); },
      },
    },
    context: { runId: "sandbox", principal: "home" },
    files,
    kv,
  };
}

function moduleName(path) {
  return String(path).replace(/^scripts\//, "").replace(/\.js$/, "");
}

function zipText(zip, path) {
  const file = zip.file(path) || zip.file("./" + path);
  if (!file || file.dir) return null;
  return file.async("string");
}

async function adopt(next) {
  pkg = next;
  $("#ref").textContent = pkg.ref;
  const steps = pkg.manifest.steps || [];
  const entry = $("#entry");
  entry.textContent = "";
  steps.forEach((s, i) => {
    const label = s.js ? `js ${s.js}` : `tool ${s.tool}`;
    const opt = el("option", null, `第${i + 1}步 · ${label}`);
    opt.value = String(i);
    entry.append(opt);
  });
  if (steps.length) entry.value = String(steps.length - 1);
  $("#run").disabled = steps.length === 0;
  $("#out").textContent = `${pkg.label} — ${steps.length} 步`;
  $("#preview").textContent = "";
  $("#viewcell").textContent = "";
  syncSelect();
  const id = pkg.local ? "" : pkg.id;
  const hash = id ? `#flow/${encodeURIComponent(id)}` : location.pathname;
  if (id && location.hash !== `#flow/${encodeURIComponent(id)}`) {
    history.replaceState(null, "", `#flow/${encodeURIComponent(id)}`);
  }
  if (!id && location.hash.startsWith("#flow/")) history.replaceState(null, "", location.pathname);
}

function syncSelect() {
  const sel = $("#flow");
  const current = pkg?.local ? "__local__" : pkg?.id;
  sel.textContent = "";
  for (const f of flows) {
    const opt = el("option", null, `${f.name || f.id} (${f.id})`);
    opt.value = f.id;
    sel.append(opt);
  }
  if (pkg?.local) {
    const opt = el("option", null, `本地 · ${pkg.label}`);
    opt.value = "__local__";
    sel.append(opt);
  }
  if (current) sel.value = current;
}

async function loadRemote(entry) {
  if (!window.jsyaml) throw new Error("js-yaml 未加载");
  const tag = releaseTag(entry);
  const refs = tag ? [tag, "HEAD"] : ["HEAD"];
  let last;
  for (const ref of refs) {
    const base = rawRoot(entry, ref);
    try {
      const manifest = jsyaml.load(await fetchOk(base + "manifest.yaml"));
      const sources = {};
      for (const p of manifest.import || []) sources[moduleName(p)] = await fetchOk(base + p);
      let cellView = null;
      if (manifest.flowView?.cell) {
        try {
          const text = await fetchOk(base + manifest.flowView.cell);
          cellView = jsyaml.load(text);
        } catch (_) { /* cell is optional for the run */ }
      }
      const pinned = tag && ref === tag;
      await adopt({
        id: entry.id,
        label: entry.name || entry.id,
        manifest,
        sources,
        cellView,
        local: false,
        ref: pinned
          ? `release ${tag} · ${entry.repo}/${entry.path || ""}`
          : (tag
            ? `HEAD（release ${tag} 还不存在，已回退）· ${entry.repo}`
            : `HEAD · ${entry.repo}/${entry.path || ""}`),
      });
      return;
    } catch (e) { last = e; }
  }
  throw last;
}

async function loadBuffer(buf, label) {
  if (!window.JSZip) throw new Error("JSZip 未加载");
  if (!window.jsyaml) throw new Error("js-yaml 未加载");
  const zip = await JSZip.loadAsync(buf);
  const manifestText = await zipText(zip, "manifest.yaml");
  if (manifestText == null) throw new Error("zip 根上没有 manifest.yaml");
  const manifest = jsyaml.load(manifestText);
  const sources = {};
  for (const p of manifest.import || []) {
    const text = await zipText(zip, p);
    if (text == null) throw new Error(`zip 缺少 ${p}`);
    sources[moduleName(p)] = text;
  }
  let cellView = null;
  if (manifest.flowView?.cell) {
    const text = await zipText(zip, manifest.flowView.cell);
    if (text != null) cellView = jsyaml.load(text);
  }
  await adopt({
    id: null,
    label,
    manifest,
    sources,
    cellView,
    local: true,
    ref: `本地 zip · ${label} · ${buf.byteLength} B`,
  });
}

function kvArgs() {
  const kv = {};
  for (const line of $("#kvseed").value.split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) kv[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return kv;
}

function evalMods(ct) {
  const mods = {};
  for (const [name, src] of Object.entries(pkg.sources)) {
    let mod;
    try {
      mod = new Function("ct", src)(ct);
    } catch (e) {
      throw new Error(`模块 ${name} 装载失败: ${e.message}`);
    }
    if (mod && typeof mod === "object") mods[name] = mod;
  }
  return mods;
}

async function run() {
  if (!pkg) return;
  const logs = [];
  const log = (m) => logs.push(m);
  const ct = makeCt(log, kvArgs());
  let mods;
  try {
    mods = evalMods(ct);
  } catch (e) {
    $("#out").textContent = e.message;
    return;
  }
  const steps = pkg.manifest.steps || [];
  const upto = Math.min(steps.length - 1, parseInt($("#entry").value, 10) || 0);
  const cont = pkg.manifest.context?.onStepError === "CONTINUE";
  let out = null;
  for (let i = 0; i <= upto; i++) {
    const s = steps[i];
    try {
      if (s.tool) {
        const r = ct.tool.call(s.tool, s.arguments || {});
        const ok = !r || r.ok !== false;
        log(`步${i + 1} tool.${s.tool} → ${ok ? "ok" : "失败"}`);
        if (!ok) throw new Error(`${s.tool} 返回失败`);
      } else if (s.js) {
        const [modName, fn] = s.js.split(".");
        const target = mods[modName]?.[fn];
        if (typeof target !== "function") throw new Error(`${s.js} 不是函数`);
        out = await target(s.arguments || {});
        log(`步${i + 1} js.${s.js} → ${out?.signal ? `signal:${out.signal}` : "ok"}`);
      }
    } catch (e) {
      log(`步${i + 1} 失败: ${e.message}`);
      if (!cont) {
        $("#out").textContent = logs.join("\n");
        renderPreview(null);
        renderCell(null);
        return;
      }
    }
  }
  $("#out").textContent = logs.concat([JSON.stringify(out, null, 2)]).join("\n");
  renderPreview(out);
  renderCell(out);
}

function sparkSeries(out) {
  if (Array.isArray(out?.sparkline) && out.sparkline.length) {
    return out.sparkline.map(Number).filter((n) => Number.isFinite(n));
  }
  const y = out?.plotly?.data?.[0]?.y;
  if (Array.isArray(y)) return y.map(Number).filter((n) => Number.isFinite(n));
  return null;
}

function sparkSvg(nums) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 240 48");
  svg.setAttribute("class", "spark");
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const pts = nums.map((n, i) => {
    const x = nums.length === 1 ? 0 : (i / (nums.length - 1)) * 240;
    const y = max === min ? 24 : 46 - ((n - min) / (max - min)) * 44;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const line = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  line.setAttribute("points", pts);
  svg.append(line);
  return svg;
}

function renderPreview(out) {
  const box = $("#preview");
  box.textContent = "";
  if (!out || typeof out !== "object") return;
  const card = el("div", "preview");
  if (out.title) card.append(el("div", "preview-title", String(out.title)));
  if (out.summary) card.append(el("div", "preview-sum", String(out.summary)));
  if (out.extra) card.append(el("div", "preview-extra", String(out.extra)));
  if (out.signal) card.append(el("div", "preview-signal", `signal · ${out.signal}`));
  const series = sparkSeries(out);
  if (series && series.length) card.append(sparkSvg(series));
  if (Array.isArray(out.news) && out.news.length) {
    const ul = el("ul", "preview-news");
    for (const item of out.news) ul.append(el("li", null, String(item)));
    card.append(ul);
  }
  if (out.plotly) card.append(el("div", "preview-extra", "Plotly · 真机投影图表（沙箱不加载 plotly.js）"));
  if (Array.isArray(out.installNodes)) {
    card.append(el("div", "preview-extra", `installNodes · ${out.installNodes.length} 个节点（沙箱不写入宿主设置）`));
  }
  box.append(card);
}

function bindPath(flow, path) {
  if (path == null) return "";
  return String(path).replace(/^flow\./, "").split(".").reduce((o, k) => o?.[k], flow) ?? "";
}

function renderCell(out) {
  const box = $("#viewcell");
  box.textContent = "";
  if (!out || !pkg.cellView) return;
  const flow = {
    lastFire: {
      tone: out.error ? "critical" : "success",
      resultText: out.title || out.summary || JSON.stringify(out).slice(0, 80),
      stepsText: `${(pkg.manifest.steps || []).length} 步`,
      progressValue: 1,
    },
    fires: 1,
    nextFireAtText: "下一次按 trigger 调度",
    hasLastFire: true,
    script: out,
  };
  const root = pkg.cellView.root || pkg.cellView;
  const children = root.column?.children || root.children || [];
  const card = el("div", "cell");
  for (const child of children) {
    const entry = Object.entries(child || [])[0];
    if (!entry) continue;
    const [type, node] = entry;
    const b = node.bind || {};
    const when = node.when || {};
    if (when.visible !== undefined && !flow[when.visible]) continue;
    if (type === "banner") {
      const tone = String(bindPath(flow, b.tone) || "info");
      const color = { critical: "#ef4444", warning: "#d97706", info: "#0284c7", success: "#16a34a" }[tone] || "inherit";
      const row = el("div", "banner", String(bindPath(flow, b.text)));
      row.style.borderLeft = `3px solid ${color}`;
      row.style.paddingLeft = "8px";
      card.append(row);
    } else if (type === "progress") {
      const wrap = el("div");
      wrap.append(el("div", "extra", String(bindPath(flow, b.label))));
      const bar = el("div", "bar");
      const fill = document.createElement("div");
      const v = Math.max(0, Math.min(1, Number(bindPath(flow, b.value)) || 0));
      fill.style.width = `${v * 100}%`;
      bar.append(fill);
      wrap.append(bar);
      card.append(wrap);
    } else if (type === "text") {
      let text = "";
      if (node.format) {
        text = String(node.format).replace(/\{(\d+)\}/g, (_, i) => bindPath(flow, (node.args || [])[+i]));
      } else {
        text = String(bindPath(flow, b.text ?? "text"));
      }
      card.append(el("div", node.variant === "caption" ? "extra" : "sum", text));
    } else if (type === "button") {
      card.append(el("span", "cellbtn", node.label || "按钮"));
    } else {
      card.append(el("div", "extra", `[${type}]`));
    }
  }
  box.append(card);
}

async function loadLocal(file) {
  if (!file) return;
  $("#out").textContent = `读取 ${file.name}…`;
  $("#run").disabled = true;
  try {
    await loadBuffer(await file.arrayBuffer(), file.name);
  } catch (e) {
    $("#out").textContent = `本地包失败: ${e.message}`;
  }
}

(async () => {
  const kv = $("#kvseed");
  kv.value = localStorage.getItem(KV_KEY) || "";
  kv.addEventListener("input", () => localStorage.setItem(KV_KEY, kv.value));

  $("#run").onclick = () => run().catch((e) => { $("#out").textContent = e.message; });
  $("#pick").onclick = () => $("#file").click();
  $("#file").onchange = () => loadLocal($("#file").files?.[0]);

  const panel = $("#panel");
  panel.addEventListener("dragover", (e) => { e.preventDefault(); panel.classList.add("drag"); });
  panel.addEventListener("dragleave", () => panel.classList.remove("drag"));
  panel.addEventListener("drop", (e) => {
    e.preventDefault();
    panel.classList.remove("drag");
    const file = [...(e.dataTransfer?.files || [])].find((f) => /\.flow$|\.zip$/i.test(f.name))
      || e.dataTransfer?.files?.[0];
    loadLocal(file);
  });

  try {
    flows = await (await fetch("community-flows.json")).json();
  } catch (e) {
    $("#out").textContent = `community-flows.json 加载失败: ${e.message}。仍可打开本地 .flow。`;
    flows = [];
  }
  $("#flow").onchange = async () => {
    if ($("#flow").value === "__local__") return;
    const entry = flows.find((f) => f.id === $("#flow").value);
    if (!entry) return;
    $("#run").disabled = true;
    $("#out").textContent = "加载…";
    try { await loadRemote(entry); }
    catch (err) { $("#out").textContent = `加载失败: ${err.message}`; }
  };

  const wanted = decodeURIComponent((location.hash.match(/^#flow\/(.+)$/) || [])[1] || "");
  const initial = flows.find((f) => f.id === wanted) || flows[0];
  if (initial) {
    try { await loadRemote(initial); }
    catch (err) { $("#out").textContent = `加载失败: ${err.message}`; }
  } else {
    syncSelect();
  }
})();
