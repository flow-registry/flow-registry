# 客户端拉取/安装协议

## 流程

```
设置 → Flow 注册表（填 base URL，留空=官方）
    │
    ▼
GET <base>/community-flows.json
    │  解析成 FlowRegistryEntry[]（id/name/description/distUrl/sha256）
    ▼
设置页列出条目 → 点「安装」
    │
    ▼
GET <distUrl> → workspace jail 下的 imports/<id>.flow
    │
    ▼
sha256 校验（index 给了就比，不符即删）
    │
    ▼
flow.import → manifest 校验 + automator 注册 + cell/detail 投影
```

## 关键点

- **base URL 是目录根**，不是 index 完整路径——客户端拼 `<base>/community-flows.json`
- `distUrl` 缺省时 fallback `<base>/dist/<id>.flow`
- `net.fetch` 是 workspace-jailed 有界 GET（`MAX_FETCH_BYTES` 上限、禁止凭证头、重定向限 10 次、非 http(s) 拒绝）
- **sha256 缺失时**记录首抓摘要标记 review，不拒——和具名源同一条路径
- 包验证在 `flow.import`：manifest 结构、steps、view schema 全检，不合格整包拒

## 自托管

任何能给 `GET /community-flows.json` + `GET /dist/<id>.flow` 的静态站都是合法 registry——GitHub Pages、nginx 目录、对象存储静态托管都行。
