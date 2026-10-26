# AssistBox Flow List

AssistBox `.flow` 包的社区目录。本仓库**只放索引和静态站**，不放包源码。

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
