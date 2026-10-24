# AssistBox Flow List

AssistBox `.flow` 包的社区目录——结构对齐 Obsidian 社区插件
（`community-plugins.json` + 静态浏览站）。

- **`community-flows.json`** — 注册表，唯一权威清单
- **`flows/`** — 本仓库自托管的 flow 源码包（`manifest.yaml` + `scripts/` + `views/` + `README.md`）
- **站点** — `index.html` 静态页（GitHub Pages），卡片网格 + ⌘K 搜索 + 详情页

## 包结构

一个 flow = 一个目录（分发时打包为 `xxx.flow` zip）：

```
flows/<id>/
├── manifest.yaml        # flow 清单：trigger / context / steps
├── scripts/*.js         # js: 步的沙箱模块（ct.tool.call / ct.context）
├── views/*.yaml         # 可选：cell / detail 视图声明
└── README.md            # 详情页正文
```

## 文档

- [docs/INDEX_SCHEMA.md](docs/INDEX_SCHEMA.md) — `community-flows.json` 的字段表
- [docs/CLIENT_PROTOCOL.md](docs/CLIENT_PROTOCOL.md) — 客户端拉取/安装协议
- [docs/MANIFEST.md](docs/MANIFEST.md) — `manifest.yaml` 字段参考
- [docs/VIEWS.md](docs/VIEWS.md) — `flow.cell.yaml`/`flow.detail.yaml` 视图 schema
- [docs/SANDBOX.md](docs/SANDBOX.md) — 沙箱页用法和与真机的差异

## 提交

见 [CONTRIBUTING.md](CONTRIBUTING.md)。
