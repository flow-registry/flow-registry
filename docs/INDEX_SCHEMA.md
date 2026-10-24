# community-flows.json — 注册表索引 schema

根是一个**裸数组**（不是 `{"flows":[...]}`）。每条 entry：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✓ | `[a-z0-9-]{1,63}`，全表唯一 |
| `name` | string | ✓ | 展示名 |
| `author` | string | ✓ | 作者 |
| `description` | string | ✓ | ≤200 字符 |
| `repo` | string | ✓ | `owner/name`——flow 源码所在仓（本仓自托管时是 `flow-registry/flow-registry`） |
| `path` | string | | `flows/<id>`——manifest 所在目录 |
| `version` | string | | semver `x.y.z` |
| `minApp` | string | | semver `x.y.z`，低于此版本的客户端应拒绝安装 |
| `tags` | string[] | | 检索标签 |
| `capabilities` | string[] | | flow 用到的工具名（`net.fetch`/`fs.read`/`script.eval`…） |
| `distUrl` | string | | `https://…` 的 `.flow` zip 直链；缺省时客户端拼 `<base>/dist/<id>.flow` |
| `sha256` | string | | dist 的 sha256；有就校验，无则按未固定源处理 |
| `seed` | bool | | 预装候选标记（客户端是否消费看实现） |

## 客户端协议

```
GET <base>/community-flows.json   → 上面的数组
GET <entry.distUrl>               → .flow zip（manifest.yaml + scripts/ + views/）
```

`.flow` = 一个 zip：`manifest.yaml` 在根，`scripts/*.js` 沙箱模块，`views/*.yaml` 可选视图，`README.md` 详情页正文。

校验脚本：`.github/scripts/validate-registry.mjs`（索引）、`validate-flows.mjs`（manifest）——CI 对 push/PR 都跑。
