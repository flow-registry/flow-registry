# 视图声明（flow.cell.yaml / flow.detail.yaml）

`flowView.cell` 是宿主格（widget/列表行）的视图，`flowView.detail` 是详情页。两者都是**声明式 UiDocument**——YAML 树，bind 路径解析到 `flow.*` 上下文。

## 结构

```yaml
cell:
  cols: 2
  rows: 1
refresh:
  on: fire          # fire | interval | manual
root:
  column:
    id: flow.cell.root
    gap: small
    children:
      - banner:
          id: flow.cell.status
          bind:
            tone: flow.lastFire.tone
            text: flow.lastFire.resultText
          when:
            visible: hasLastFire
          actionChild:
            button:
              id: flow.cell.open
              label: 详情
              actionId: flow.openDetail
      - progress:
          id: flow.cell.progress
          bind:
            label: flow.lastFire.stepsText
            value: flow.lastFire.progressValue
      - text:
          id: flow.cell.meta
          variant: caption
          format: "已触发 {0} 次 · 下次 {1}"
          args:
            - flow.fires
            - flow.nextFireAtText
```

## 节点类型

| 类型 | 关键字段 | 说明 |
|---|---|---|
| `banner` | `bind.tone`/`bind.text` + `when`/`actionChild` | 状态横条；tone ∈ `critical`/`warning`/`info`/`success`/`muted` |
| `progress` | `bind.label`/`bind.value`（0-1） | 进度条 |
| `text` | `bind.text` 或 `format`+`args` | 文本；`variant: caption` 小字 |
| `button` | `label` + `actionId` | 动作；`flow.openDetail` 打开详情页，`flow.refresh`/`flow.retry`/`flow.cancel` 是内建 |
| `column`/`row` | `children` + `gap`/`id` | 容器 |
| `grid` | `cols`/`rows`/`children` | 网格 |

## `flow.*` 上下文

| 路径 | 类型 | 说明 |
|---|---|---|
| `flow.lastFire.tone` | string | 最近一次 fire 的 tone |
| `flow.lastFire.resultText` | string | 最近一次的结果文本（script 返回的 title/summary 或默认） |
| `flow.lastFire.stepsText` | string | 步进文本 |
| `flow.lastFire.progressValue` | number | 0-1 |
| `flow.fires` | number | 累计 fire 次数 |
| `flow.nextFireAtText` | string | 下次触发时间 |
| `flow.script.*` | any | 最近一个 `js:` 步的返回值——`render()` 的输出从这里进视图 |
| `hasLastFire` | bool | `when.visible` 用——没 fire 过为 false |

## `refresh.on`

- `fire`：fire 完重投影（默认）
- `interval`：宿主定期重投影（`refresh.intervalMillis`）
- `manual`：冻结——显式「刷新」才更新

## `actionId` 内建

`flow.openDetail`（开详情）、`flow.refresh`（重投影）、`flow.retry`/`flow.cancel`（运行中控制，cancel 要宿主确认）。

## 边界

视图只能 bind `flow.*` 和字面量——**不能直接 bind 脚本输出对象以外的数据**（脚本输出走 `flow.script`）。cell 不能开 app 外部动作，detail 可以链 `assistbox://` 深链。
