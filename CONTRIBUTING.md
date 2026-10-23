# 提交一个 flow

## 托管在本仓库

1. `flows/<id>/` 放包源码：`manifest.yaml`（必需）、`scripts/`、`views/`、`README.md`
2. 在 `community-flows.json` 追加一条：

```json
{
  "id": "my-flow",
  "name": "显示名",
  "author": "你的名字",
  "description": "一句话说明（卡片上最多三行）",
  "tags": ["标签"],
  "repo": "qedmi/assistbox-flows",
  "path": "flows/my-flow"
}
```

3. 提 PR。合并后站点自动收录。

## 托管在自己的仓库

`repo` 填 `owner/name`，`path` 为包所在子目录（根目录可省）。仓库需公开可读——
站点通过 `raw.githubusercontent.com` 直接读 `manifest.yaml` 和 `README.md`。

## 规则

- `id` 全局唯一，`[a-z0-9-]` 小写连字符
- `manifest.yaml` 必须能被 AssistBox `FlowManifestParser` 解析
- 不提交凭据、不提交他人订阅地址
- 破坏性步骤（写文件/装节点/发通知）要在 README 里写清楚

## 版本字段（预留，暂不实装）

`version` / `minApp` 现在只是元数据声明：校验脚本查格式（semver），站点详情页会显示，但 **app 不消费**——不做版本选择、不做 minApp 门禁、没有更新提示。等"应用内市场"落地后再启用语义：版本化 release tag、`versions.json` 兼容选择、sha256 校验与更新通道都归那一期。现在写准即可，别依赖它被检查。
