# 提交一个 flow

本仓库没有 `flows/`。索引在 `community-flows.json`，zip 在包仓库的 Release 上。

## 官方包（flow-registry/flow-package）

1. 在 [flow-package](https://github.com/flow-registry/flow-package) 改 `flows/<id>/`。展示名和简介写在 `manifest.yaml`；作者、标签、`seed`、`minApp` 写在 `registry.yaml`。不要在索引里再抄一遍。改了进包的字节就改 `VERSION`。
2. `node .github/scripts/build-flows.mjs` 会重写 `catalog.json`（capabilities、distUrl、sha256 都在这里）。把它和源码一起提交。CI 会卡「catalog 和树不一致」。
3. 合并到 `main` 后 Actions 发布不可变 release：`https://github.com/flow-registry/flow-package/releases/download/<id>-v<version>/<id>.flow`。同一 tag 哈希对不上会失败，不能覆盖。
4. 在本仓库跑 `node .github/scripts/sync-index.mjs`，提交生成的 `community-flows.json`。不要手改官方条目。

官方条目必须同时满足：`repo` 为 `flow-registry/flow-package`，`path` 为 `flows/<id>`，`distUrl` 为上面的 release 直链，`sha256` 为 64 位小写 hex。

## 托管在自己的仓库

往 `external-flows.json` 追加一条（字段见 INDEX_SCHEMA），再跑 sync。`repo` 不能是 `flow-registry/flow-package`。`distUrl` 指向一个 https 的 `.flow` zip；给了 `sha256` 客户端就会校验。站点用 `raw.githubusercontent.com` 读 manifest 和 README——`distUrl` 含 `/releases/download/<tag>/` 时钉在该 tag，否则用 `HEAD`。

## 规则

- `id` 全局唯一，`[a-z0-9-]` 小写连字符
- `manifest.yaml` 必须能被 AssistBox `FlowManifestParser` 解析
- 不提交凭据、不提交他人订阅地址
- 破坏性步骤（写文件/装节点/发通知）要在 README 里写清楚

## 版本

- `version` 选择官方包的 release tag `<id>-v<version>`。客户端安装的是 `distUrl` 那一个 asset，不做版本协商，也不在本站提供「更新通道」。
- `minApp` 仍只是声明：校验脚本查 semver，详情页会显示，**当前 app 不门禁**。
- `sha256` 会在 `flow.import` 前比对；官方包必填。
