# ClimbLog V0.1 技术设计

## 1. 技术目标

- 构建完全本地运行的响应式 Web 应用。
- 保证训练数据结构化、持久化、可筛选和可统计。
- 将攀岩规则与界面分离，确保规则可以独立测试。
- 保持依赖和架构精简，为备份恢复和后续能力预留边界。

## 2. 技术栈

| 领域 | 选择 |
| --- | --- |
| 运行时 | Codex 内置 Node.js `v24.14.0` |
| 包管理器 | pnpm `11.7.0` |
| UI | React + TypeScript |
| 构建 | Vite |
| 本地数据 | IndexedDB |
| 样式 | CSS Variables + 响应式 CSS |
| 单元与组件测试 | Vitest + React Testing Library（实现阶段引入） |
| 浏览器验收 | Chrome、Microsoft Edge |

不使用服务端、外部 API、远程数据库或系统级环境修改。

## 3. 架构

```text
React UI
  ↓ 用户操作 / UI State
Application Services
  ↓
Domain Rules
  ↓
Repository
  ↓
IndexedDB
```

职责：

- UI：页面、组件、表单状态和视觉反馈。
- Application：组织新增、编辑、筛选、统计和备份用例。
- Domain：难度、完成状态、尝试次数和统计规则。
- Repository：统一的数据读写接口。
- IndexedDB：训练记录的唯一真实来源。

## 4. 建议源码结构

```text
src/
├── app/
├── components/
├── domain/
│   ├── grades/
│   ├── models/
│   └── rules/
├── features/
│   ├── dashboard/
│   ├── entries/
│   ├── history/
│   ├── analytics/
│   └── backup/
├── data/
│   ├── indexed-db/
│   └── repositories/
├── styles/
└── test/
```

V0.1 保持单一前端应用，不提前拆分工作区包或微前端。

## 5. 核心数据模型

`RouteEntry`：

- `id`: string
- `climbType`: `boulder | sport`
- `gradeSystem`: `v-scale | french`
- `gradeCode`: string
- `gradeOrder`: number
- `result`: `onsight | flash | send | attempt`
- `attemptCount`: number
- `climbedAt`: ISO 8601 string
- `location`: optional string
- `routeName`: optional string
- `notes`: optional string
- `createdAt`: ISO 8601 string
- `updatedAt`: ISO 8601 string

索引至少覆盖：

- 攀爬时间。
- 攀岩类型。
- 完成状态。
- 类型与难度排序组合。

## 6. 领域规则

- 抱石只能使用 V Scale，支持 Flash、Send、Attempt。
- 难度攀登只能使用法国难度，支持 Onsight、Flash、Send、Attempt。
- Onsight 与 Flash 固定 1 次尝试。
- Send 至少 2 次尝试。
- Attempt 至少 1 次尝试。
- 两种难度体系分别排序和统计。
- 领域规则必须在写入 Repository 前验证，不能只依靠 UI 控制。

## 7. 数据版本与备份

- IndexedDB 数据库使用显式 schema 版本。
- 升级时使用迁移逻辑，禁止默认清空数据。
- 备份格式包含 `formatVersion`、`exportedAt` 和记录列表。
- 恢复前完成结构、版本和字段验证。
- V0.1 只做完整恢复，不做复杂合并。
- 恢复失败时维持原有数据库不变。

## 8. UI 与视觉

- 移动端优先，桌面端限制内容最大宽度并保留充足留白。
- 使用低饱和岩石色、深绿或蓝绿色作为品牌色。
- 统一字号、间距、圆角、边框和阴影变量。
- 每个页面只突出一个主要动作。
- 状态不只通过颜色表达。
- 可选字段折叠，减少快速记录干扰。
- 图表使用轻量 SVG 或 CSS 实现，首版不引入大型图表库。

## 9. 浏览器与运行方式

- 开发环境通过 Vite 本地服务器运行。
- 目标浏览器为当前 Chrome 和 Edge。
- 生产构建输出静态资源。
- 不支持直接双击 `index.html` 作为正式运行方式；应通过本地静态服务器提供资源，以保持一致的路由与存储来源。

## 10. 风险控制

- 浏览器站点数据被清除：提供显著备份入口和风险提示。
- IndexedDB 升级失败：实现迁移测试和失败保护。
- 难度顺序错误：固定常量表并进行完整性测试。
- 重复保存：保存期间禁用按钮并避免重复提交。
- 统计误导：展示样本数，两种体系分开分析。
- 范围膨胀：V0.1 仅实现记录、历史、分析和备份恢复。

## 11. 初始化状态

- React + TypeScript + Vite 骨架已选择。
- 复杂功能尚未开始实现。
- 下一步先建立领域规则、测试框架和页面信息架构。
