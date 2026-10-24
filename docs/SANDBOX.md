# 沙箱页（sandbox.html）

浏览器里跑 flow 的步 + 渲染 cell——给作者预览用，不等同真机。

## 和真机的差异

| 面 | 沙箱 | 真机 |
|---|---|---|
| `ct.tool.call` | 同步返回（JS 单线程） | 同步（JNI 桥） |
| `net.fetch` | 同步 XHR——CORS 卡死就卡死 | workspace-jailed fetch，无 CORS |
| `storage.kv`/`storage.n` | 同一内存 Map，页面刷新即丢 | Room KV |
| `signal` | 只记录 | 投递给 `on:` 订阅者 |
| `trigger` | 手动跑步 | `every`/`on:` 真实调度 |
| `cell` | 简化的 banner/progress/text/button | 完整 UiDocument（grid/format/when/action） |

## 用法

- **Flow**：从 `community-flows.json` 拉
- **跑到第几步**：步是顺序执行的，`tool:` 步先跑（net.fetch 真发请求）再跑 `js:` 步
- **KV 种子**：`key=value` 每行一条——给 `ct.storage.kv.get` 用（比如 `proxy.subscription.url=…`）

## ABI 要点

脚本是一个**以 `return { fn: function(args) {...} }` 结尾的模块体**——`ct` 在模块作用域，入口函数只收 `args`。`ct.tool.call(name, args)` 同步返回 `{text}`/`{value}`/`{ok}` 形态（不是 Promise）。
