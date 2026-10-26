# community-flows.json — 注册表索引 schema

根是一个**裸数组**（不是 `{"flows":[...]}`）。每条 entry：

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `id` | string | ✓ | `[a-z0-9-]{1,63}`，全表唯一 |
| `name` | string | ✓ | 展示名 |
| `author` | string | ✓ | 作者 |
| `description` | string | ✓ | ≤200 字符 |
| `repo` | string | ✓ | `owner/name`——源码仓。官方包是 `flow-registry/flow-package` |
| `path` | string | | manifest 所在目录。官方包是 `flows/<id>` |
| `version` | string | | semver `x.y.z`。官方包决定 release tag `<id>-v<version>` |
| `minApp` | string | | semver `x.y.z`。当前客户端不门禁，只展示 |
| `tags` | string[] | | 检索标签 |
| `capabilities` | string[] | | flow 用到的工具名（`net.fetch`/`fs.read`/`storage.kv`…） |
| `distUrl` | string | | `.flow` zip 的 https 直链。官方包必须是 `https://github.com/flow-registry/flow-package/releases/download/<id>-v<version>/<id>.flow`。缺省时客户端拼 `<base>/dist/<id>.flow`（本站不再提供这个目录） |
| `sha256` | string | | dist 的 sha256（64 位小写 hex）。官方包必填；有则客户端校验，无则按未固定源处理 |
| `seed` | bool | | 预装候选标记（客户端是否消费看实现） |

官方包的 zip **不在本仓库、也不在 Pages 的 `dist/`**。字节只存在于 flow-package 的 Release，tag 不可变。

## 索引不要手写

`community-flows.json` 是生成文件：

| 来源 | 字段 |
|---|---|
| `manifest.yaml` | `name`、`description` |
| `flows/<id>/registry.yaml` | `author`、`tags`、`seed`、`minApp`（唯一要手写的索引字段） |
| 打包脚本扫描 steps / 脚本 | `capabilities`（`tool:`、`ct.tool.call`、`ct.storage.kv`/`n`，有 `js:` 步则加 `script.eval`） |
| `VERSION` + zip sha256 | `version`、`distUrl`、`sha256`、`repo`、`path` |

flow-package 构建写出 `catalog.json`。本仓库的 `external-flows.json` 只放第三方条目。合成命令：

```
node .github/scripts/sync-index.mjs
```

官方 id 出现在 `external-flows.json` 里会被拒绝。

## 客户端协议

```
GET <base>/community-flows.json   → 上面的数组
GET <entry.distUrl>               → .flow zip（manifest.yaml + scripts/ + views/ + README.md）
```

`.flow` = 一个 zip：`manifest.yaml` 在根，`scripts/*.js` 沙箱模块，`views/*.yaml` 可选视图，`README.md` 详情页正文。`VERSION` 不属于包。

校验：`.github/scripts/validate-registry.mjs` 查字段；能 checkout 到 flow-package 时再跑 `sync-index.mjs --check`，官方条目和 `catalog.json` 不一致就失败。包本身的 manifest 校验在 [flow-package](https://github.com/flow-registry/flow-package)。
