# AssistBox Flow List

AssistBox `.flow` 生态的**索引与浏览站**。本仓库**只放索引、协议文档和静态站**，不放格式规范，也不放包源码。

组织分工（单向依赖）：

- [flow-package](https://github.com/flow-registry/flow-package) — `.flow` 格式规范（`spec/FLOW_FORMAT.md`）、打包器、官方包源、conformance。Release 附件即官方 dist。
- [flow-vendor](https://github.com/flow-registry/flow-vendor) — vendored 第三方库：`spec/VENDOR_FORMAT.md`、构建审查管线、curated `libs/`（Debian 维护者模型）。产物经索引以 `type: "vendor"` 分发。
- **flow-registry（本仓）** — 索引 schema、客户端协议、浏览站。只索引字节 + sha256，不含格式知识。
- [editor](https://github.com/flow-registry/editor) — （规划中）

- **`community-flows.json`** — 生成的注册表（官方条目来自 flow-package 的 `catalog.json`，第三方在 `external-flows.json`）
- **包** — [flow-registry/flow-package](https://github.com/flow-registry/flow-package) 的 GitHub Release 附件（`<id>-v<version>` / `<id>.flow`）
- **站点** — `index.html` 目录 + `sandbox.html` 预览（GitHub Pages）

## 文档

- [docs/INDEX_SCHEMA.md](docs/INDEX_SCHEMA.md) — `community-flows.json` 的字段表
- [docs/CLIENT_PROTOCOL.md](docs/CLIENT_PROTOCOL.md) — 客户端拉取/安装协议
- [docs/MANIFEST.md](docs/MANIFEST.md) — `manifest.yaml` 字段参考
- [docs/VIEWS.md](docs/VIEWS.md) — `flow.cell.yaml`/`flow.detail.yaml` 视图 schema
- [docs/SANDBOX.md](docs/SANDBOX.md) — 沙箱页用法和与真机的差异

## 提交

见 [CONTRIBUTING.md](CONTRIBUTING.md)。改官方包去 flow-package；本仓库只更新索引条目。
