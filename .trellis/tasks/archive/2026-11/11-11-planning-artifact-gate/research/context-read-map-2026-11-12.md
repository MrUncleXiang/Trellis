# A：上下文与规范定向读取索引

本文件是任务交接索引，不是取代现行规范的新标准。四份当前材料为 `prd.md`、`design.md`、`implement.md`、`research/test-plan-2026-11-12.md`；历史快照只供追溯，冲突以当前需求为准。任务仍在规划，未获实施授权。

## 为什么不把大规范全文塞入清单

2026-11-12 实测 `task.py validate` 提示：script-conventions约131KB、platform-integration约191KB、configurator-shared约40KB、quality-guidelines约45KB，超过单文件32KB注入上限。大文件即使存在且清单通过，也只会注入前段；不能据此声称执行者看到了全部规范。现改为本索引加必要的较短规范，实施时按下表定向阅读真实原文件。不要提高全局上限或复制整份规范来掩盖问题。

## 在实际修改之前读取

| 修改区域 | 原文件与必须查找的章节/函数 |
| --- | --- |
| 新Python模块、任务命令 | `.trellis/spec/cli/backend/script-conventions.md`：Overview（Python3.9与future annotations）、Two script trees, one content（同路径集与逐字节一致）、Script Types（common模块不能直接执行）、Windows输出与真实命令回归相关章节；使用当前 `common/io.py` 的实际实现，不能照抄规范内较早的非原子写示例 |
| 持久状态、指针、归档 | `.trellis/spec/cli/backend/filesystem-safety.md`：原子写入、路径边界、两树同步。实际API是 `read_json_checked` 与 `write_json`，后者返回bool；坏记录不补造，写失败不报成功；多文件写不等于事务 |
| 平台提示与材料读取 | `.trellis/spec/cli/backend/platform-integration.md`：Planning Artifact and JSONL Context Contract、class-2平台活动任务发现、共享目录中立占位替换与模板映射；其中旧三文件轻重规则由本任务修改，其余平台边界保持 |
| 共用生成器与21个平台产物 | `.trellis/spec/cli/backend/configurator-shared.md`：Template maps、Placeholder substitution、Pull-based prelude；实际注册以 `packages/cli/src/configurators/shared.ts`、各platform收集器为准，不能手改生成结果掩盖来源遗漏 |
| 每轮状态路由 | `.trellis/spec/cli/backend/workflow-state-contract.md`：状态写入与Reachability matrix；保留任务创建许可、in_progress提交入口和完成态现有行为；本任务使用既有planning状态，不增加伪状态 |
| 测试与质量 | `.trellis/spec/cli/unit-test/conventions.md`、`mock-strategies.md`、`integration-patterns.md`：环境隔离、真实流程、只模拟外部故障；`.trellis/spec/cli/backend/quality-guidelines.md`：明确返回类型、禁any/非空断言、分层质量要求。完整失败记录不能用跳过或删测试掩盖 |
| 新模块随init/update发货 | `packages/cli/src/templates/trellis/index.ts` 的显式导出和 `getAllScripts()`；只有新增磁盘文件不代表会发货；dist通过build生成，不能直接改 |
| 任务入口分发 | `packages/cli/src/templates/trellis/scripts/task.py` 的 `main()` 末尾 `commands` 字典；不是 `args.func`。增加parser却只set_defaults不会让现有入口调用处理器 |
| 子代理自动注入与自修边界 | `packages/cli/src/templates/shared-hooks/inject-subagent-context.py` 的 `build_implement_prompt`、`build_check_prompt`；首次开工材料不能写成可省略；check自修不能批准新方向；历史恢复兼容要单独说明 |

## 不能丢失的现有行为

- 两份Python树同路径、逐字节一致；Windows默认 `python`，其他平台 `python3`；Python3.9语法约束不能拿高版本成功代替。
- 活动会话定位不是实施授权；创建后仍可 `planning`。`--allow-empty-context` 只控制旧JSONL上下文清单。
- 角色上下文注入次序保持：精选清单 → 需求 → 设计 → 实施计划；必要时定向补读原文件，不能把截断提示当全文已读。
- B的研究保存、前提核查和交接规则保留；C的归档提交来源仍独立。
- 42项既有修改受保护。开工前分析影响，提交前检查实际变更范围；索引失败或过期不等于无影响。

## 当前规划的审查重点

1. 三文件职责一致，内容短可接受，空白不可接受；指纹不判断语义质量。
2. `reviewId`只标版本，`planningApproval`只记可回查的声明，不能伪称验证了用户身份。
3. `--editorial-note`用于答复后尚未开工的文字勘误，`attest --editorial`用于已登记确认后的勘误；实质变化必须重新确认。
4. `replan`先暂停受影响工作，再回planning；程序不自动停止工作进程，独立工作要有真实依赖依据。
5. 拒绝发生在开工副作用之前；task.json写入与会话指针并非跨文件事务，故障状态要诚实报告。
6. 旧新对照分别报告共同命令变化与新增能力；旧版不识别参数不能算普通修复收益。

执行进度与规划分开：`implement.md` 保持已审指令，实际完成步骤和输出写入 `research/implementation-progress.md`。直接改计划中的勾选也会改变指纹，不为此增加隐式忽略规则。本任务新门禁尚未存在时，开工按 `bootstrap-review-2026-11-12.md` 的人工版本清单和当前既有命令进行。

独立规划审查的原始输入和处理分别见 `independent-review-target-2026-11-12.json`、`independent-review-input-2026-11-12.zip`、`independent-review-dispositions-2026-11-12.md`；旧现状研究在 `planning-review-2026-11-12.md`。这些历史长报告按问题定向读取，不再次全文注入以挤掉当前三份规划。R10的状态提示并非本轮擅自扩展：整合前需求的验收已明确要求SessionStart显示同一声明说明，当前只读查询是避免平台各写一套检查的实现方式。
