# 可执行的 AI 软件质量门禁

## 问题

角色职责和测试规范如果只存在于文档中，无法证明命令真正执行，也无法保证失败后回到修复循环。需要用机器可读配置、统一执行器、失败证据和角色出口条件把流程闭合。

## 通用模式

1. 每个项目声明真实的 lint、类型检查、相关测试、全量测试、构建和冒烟命令。
2. 执行器按快速或完整配置运行，记录退出码、耗时和有限错误摘要。
3. 必需检查失败即关闭发布路径；不适用项必须解释，不能伪装为通过。
4. 测试失败进入“证据—根因—最小修复—失败测试—相关回归—全量门禁”循环。
5. 角色交接依赖同一份证据，测试工程师不能放宽标准，发布经理不能绕过红灯。
6. 门禁与高风险授权分离；自动测试通过不代表获得生产提交、数据删除或远程上传许可。
7. 门禁执行器使用 Python 3 标准库和系统原生 shell，避免把工作室绑定到单一桌面操作系统。

## 公开项目参考

调研日期：2026-10-22。以下仅记录公开仓库链接和概念层参考，本实现未复制第三方代码或文案。

- https://github.com/anomalyco/opencode
- https://github.com/anthropics/claude-code
- https://github.com/openai/codex
- https://github.com/aaif-goose/goose
- https://github.com/google-gemini/gemini-cli
- https://github.com/OpenHands/OpenHands
- https://github.com/cline/cline
- https://github.com/Kilo-Org/kilocode
- https://github.com/QwenLM/qwen-code
- https://github.com/Aider-AI/aider

## 适用边界

- 门禁证明的是已配置检查范围，不是零缺陷保证。
- 质量命令必须来自已审阅的项目配置。
- 外部依赖故障应与代码失败分层，但必须留下证据。
- 删除疑似死代码前仍要排除动态加载、反射、配置和外部调用。
