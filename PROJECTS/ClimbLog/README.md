# ClimbLog

## 项目介绍

ClimbLog 是一款面向攀岩爱好者的个人训练记录助手。当前版本以本地 Web 原型形式运行，支持记录抱石与难度攀登线路，并在浏览器本地保存训练数据。

项目遵循 AI Software Studio 的需求、技术设计、风险评估、开发、测试和用户体验验收流程。当前仍处于开发阶段，不是正式发布版本。

## 当前版本

- 版本：`v0.1.0-alpha`
- 状态：本地 Web 原型，开发中
- 数据范围：仅保存在当前浏览器，不连接外部接口

## 技术栈

- React 19
- TypeScript 6
- Vite 8
- IndexedDB
- idb
- Vitest
- fake-indexeddb
- Oxlint
- Codex 内置 Node.js `v24.14.0`
- pnpm `11.7.0`

## 本地运行方法

本项目使用 Codex 内置 Node.js 和 pnpm，不要求修改系统环境。

在 `PROJECTS/ClimbLog` 目录中执行：

```text
pnpm install
pnpm dev
```

默认访问地址：

```text
http://127.0.0.1:5173
```

质量检查：

```text
pnpm test
pnpm lint
pnpm build
```

如果本机未将 Node.js 和 pnpm 加入 PATH，应使用 AI Software Studio 当前工作环境提供的内置运行时执行命令。

## 已完成功能

- React + TypeScript + Vite 项目骨架。
- 移动端优先的本地 Web 界面。
- 抱石 V Scale 难度表。
- 难度攀登法国难度表。
- Onsight、Flash、Send、Attempt 领域规则。
- 尝试次数校验规则。
- IndexedDB 本地数据持久化。
- 训练记录新增、查询和删除。
- 按攀岩类型筛选历史记录。
- 线路数、完成数和完成率基础统计。
- 领域规则与数据层自动化测试。
- lint、TypeScript 检查和生产构建。

## 未完成功能

- 编辑已有训练记录。
- 按完成状态、难度和日期范围进行完整筛选。
- 完整成长分析和趋势图表。
- 本地 JSON 备份与恢复。
- 更完整的异常处理和用户反馈。
- Chrome 与 Edge 的正式用户体验验收报告。
- 正式发布、部署和回滚流程。

## 项目结构

```text
ClimbLog/
├── docs/       产品、技术和测试文档
├── src/        应用源码
├── tests/      项目级测试目录
├── reports/    测试、验收和发布报告
└── README.md   项目说明
```

## 项目文档

- `docs/PRD.md`
- `docs/TECH_DESIGN.md`
- `docs/TEST_PLAN.md`
