# 沙箱页（sandbox.html）

浏览器里跑 flow 的步 + 渲染 cell——给作者预览用，不等同真机。目录详情页的「在沙箱预览」打开 `#flow/<id>`。

## 包从哪来

在线预览**不读本仓库**（这里没有源码）。顺序：

1. 本地 `.flow`（文件选择或拖进面板）——跑的就是 zip 字节，和客户端安装的是同一个包。
2. 否则按索引的 `distUrl` 解析 release tag（`/releases/download/<tag>/`），用 `raw.githubusercontent.com/<repo>/<tag>/<path>` 读 manifest / scripts / views。这些文件就是打进该 tag 的 zip 的内容。
3. tag 还不存在（release 没发出来）时回退 `HEAD`，状态行会写明。

GitHub Release 附件没有 CORS，Pages 上的页面不能直接 `fetch` zip。要对齐字节，用本地 `.flow`。

## 和真机的差异

| 面 | 沙箱 | 真机 |
|---|---|---|
| `ct.tool.call` | 同步返回（JS 单线程） | 同步（JNI 桥） |
| 模块里的 `ct` | 和本轮 `tool:` 步是**同一个**对象，每轮重新装载模块 | 同一次 fire 内同一个 `ct` |
| `net.fetch` | 同步 XHR，响应上限 1.5MB；CORS 卡死就卡死 | workspace-jailed fetch，无 CORS |
| `storage.kv`/`storage.n` | 同一内存 Map。KV 种子存在 `localStorage`，刷新还在；文件表每轮清空 | Room KV |
| `signal` | 只记录 | 投递给 `on:` 订阅者 |
| `trigger` | 手动跑步 | `every`/`on:` 真实调度 |
| `cell` | banner/progress/text/button + 脚本输出（summary/sparkline/news/signal） | 完整 UiDocument（grid/format/when/action） |
| `onStepError: CONTINUE` | 记失败并继续 | 同语义 |

## 用法

- **Flow**：`community-flows.json` 的条目，或本地 zip。
- **跑到第几步**：步顺序执行。`tool:` 步先落盘，后面的 `js:` 步读的是同一轮的文件表。
- **KV 种子**：`key=value` 每行一条，给 `ct.storage.kv.get`（例如 `proxy.subscription.url=…`）。

## ABI 要点

脚本是一个**以 `return { fn: function(args) {...} }` 结尾的模块体**——`ct` 在模块作用域，入口函数只收 `args`。`ct.tool.call(name, args)` 同步返回 `{text}`/`{value}`/`{ok}` 形态（不是 Promise）。沙箱每轮用当前 `ct` 重新执行模块体，避免上一轮的文件表被闭包粘住。
