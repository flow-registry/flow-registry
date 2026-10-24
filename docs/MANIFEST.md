# manifest.yaml 参考

`.flow` 包的根清单。一个最小例子：

```yaml
flow: "1"
name: "示例"
description: "一句话说明（≤200字）"

trigger:
  every: "5m"          # 或 at: "08:00" / on: "信号名"（on 要加引号——YAML 1.1 布尔）

context:
  onStepError: ABORT_FLOW   # 或 CONTINUE
  maxFires: 10000

import:
  - "scripts/main.js"       # js: 步引用的模块

flowView:
  cell: "views/flow.cell.yaml"     # 可选——宿主格视图
  detail: "views/flow.detail.yaml" # 可选——详情页视图

steps:
  - tool: net.fetch           # tool: 步——宿主工具调用
    arguments:
      url: "https://…"
      path: "data.json"
  - js: main.render           # js: 步——<模块名>.<函数>
    arguments: {}
```

## 字段

- **`flow`**：schema 版本，目前 `"1"`
- **`trigger.every`**：间隔（`5m`/`12h`/`1d`）；`at`：定时；`on`：信号名（YAML 1.1 里 `on:` 是布尔，要加引号 `"on: xxx"` 或写 `trigger: {on: "…"}`）
- **`context.onStepError`**：`ABORT_FLOW`（默认）/ `CONTINUE`
- **`context.maxFires`**：fire 次数上限
- **`import`**：`scripts/` 下的模块列表——`js:` 步的 `<mod>.<fn>` 从这里解析
- **`flowView.cell`**：宿主格（widget/列表）的视图声明
- **`flowView.detail`**：点开详情页的视图声明

## 步（step）

- `tool:`——宿主工具（`net.fetch`/`fs.*`/`storage.*`/`webdav.*`/`ssh.*`…），arguments 原样透传
- `js:`——`<模块文件名>.<导出函数>`，args 是函数唯一参数

步**顺序执行**——后面的步能读到前面步落的盘（`fs.read`）或 KV。
