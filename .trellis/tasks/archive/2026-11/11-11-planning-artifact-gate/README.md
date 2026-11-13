# A：已交付归档入口

2026-11-13，用户要求完成本轮收尾。A 的实现及约定验收已完成，代码与证据已推送并包含在 `codex/personal` 个人长期分支；本目录保留完成状态、批准材料、旧新对照及验收原文。

## 当前可用入口

- [父任务现状](../../../11-12-task-artifact-reliability/prd.md)：A/B 已交付，C 暂缓；父任务不冒称三项全部完成。
- [B 的有限验收决定](../11-12-research-evidence-handoff/research/acceptance-2026-11-12.md)：保留既有已知限制。
- [C 暂缓决定](../../../11-12-archive-commit-provenance/prd.md)：没有授权实施新功能。
- [最终验收结论](research/final-acceptance-result.md)：逐项约定、真实确认及能力边界。
- [固定版本同条件对照](research/version-comparison/9b76fe49f19d-1b801471966e/report.md)。
- [本轮主分支与候选版整合对照](../../../11-12-task-artifact-reliability/research/integration-review-2026-11-13/report.md)。
- [本轮收尾报告](../../../11-12-task-artifact-reliability/research/closure-2026-11-13.md)。
- [批准材料及指纹](research/final-planning-review/A-20261112-R2/manifest.json)：五份冻结材料原文均保留。

## 历史材料与当前状态

[需求原文](prd.md)、[设计原文](design.md)、[实施计划原文](implement.md) 和两份冻结支持材料保持批准时字节，不为归档重写历史。其中的旧进度、原路径及历史相对链接描述当时现场，不能当成当前状态；查找父任务、B/C 和验收证据请使用本入口。上下文清单中的仓库路径及任务记录的资料位置已调整到归档路径；没有新增 C 的提交校验功能。

## 交付边界

A 直接专项 115 项通过；B 的约定测试 11 项通过。此前主分支与候选版的完整同条件比较没有新增失败，但命令行两版仍有相同的 17 项旧失败、35 项跳过，核心两版各 398 通过、2 跳过。归档不等于将旧失败判为通过，不等于机器能验证真实用户身份或保证模型每次理解正确。后续修复已有失败应单独立项。
