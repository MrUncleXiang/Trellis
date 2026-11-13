# A 验收覆盖检查点（2026-11-13）

主体：主会话核查，不是新增独立审查。实现固定于 `1b801471966e8fb898d0c33e1b025aad2a86f5db`。本记录不修改冻结规划，也不把单个测试总数等同于全部需求验收。

## R1—R11

| 要求 | 实际证据 | 当前结论 |
| --- | --- | --- |
| R1 | T01—T04、T22、T35；真实 3.9 四步；M1/M5 | 最低文本门禁已核；语义由审阅负责 |
| R2 | T05—T09、T14；P11/P12 | 声明与版本指纹已核 |
| R3 | T10—T14、T17—T18；P11—P15；S0 | 机器门禁已核；M2 真实新答复待补，不能完全关闭 |
| R4 | T07/T08/T12/T14—T19；P12；M3/M6 | 版本与勘误链已核；语义和身份不是机器安全保证 |
| R5 | T19—T22/T26/T37；P13；M4 | 回规划及实际暂停演练已有证据；不会自动暂停任意外部进程 |
| R6 | T01/T06/T11—T13/T24/T25/T27；P01—P07/P14 | 副作用之前拒绝已核；T38 仅并发观察 |
| R7 | T07/T10/T18/T29；P09/P15 | 等待确认与允许实施已区分 |
| R8 | T21—T24/T26/T28/T32；P08/P10/P16 | 旧恢复及归档原行为已核 |
| R9 | T03/T05/T09/T16/T20/T24/T27/T34；29 对脚本；P10 | 原子记录与保留未知键已核 |
| R10 | T29—T37；P15；78 个实际生成结果；平台独立复审 | 四种实际消费者及工作流已核，B 规则保留 |
| R11 | 下表、正式 P01—P16、M1—M6/S0 | 对照已补齐；M2 真人证据及最终证据提交未完 |

## T01—T38 逐项定位

以下均进入 `pinned-implementation-focused.txt` 的三个测试文件，合计 115 通过。行号定位到实现提交的测试定义；参数化测试的断言数多于矩阵组数。T38 成功只代表完成观察，不代表提供并发保护。

| 编号 | 测试定义位置 | 判定 |
| --- | --- | --- |
| T01 | `packages/cli/test/scripts/task-planning.integration.test.ts:206`；`packages/cli/test/scripts/task-planning.integration.test.ts:217` | 自动断言通过；不扩大为语义或真人身份保证 |
| T02 | `packages/cli/test/scripts/task-planning.integration.test.ts:230` | 自动断言通过；不扩大为语义或真人身份保证 |
| T03 | `packages/cli/test/scripts/task-planning.integration.test.ts:250` | 自动断言通过；不扩大为语义或真人身份保证 |
| T04 | `packages/cli/test/scripts/task-planning.integration.test.ts:281` | 自动断言通过；不扩大为语义或真人身份保证 |
| T05 | `packages/cli/test/scripts/task-planning.integration.test.ts:298` | 自动断言通过；不扩大为语义或真人身份保证 |
| T06 | `packages/cli/test/scripts/task-planning.integration.test.ts:309` | 自动断言通过；不扩大为语义或真人身份保证 |
| T07 | `packages/cli/test/scripts/task-planning.integration.test.ts:317` | 自动断言通过；不扩大为语义或真人身份保证 |
| T08 | `packages/cli/test/scripts/task-planning.integration.test.ts:336` | 自动断言通过；不扩大为语义或真人身份保证 |
| T09 | `packages/cli/test/scripts/task-planning.integration.test.ts:357`；`packages/cli/test/scripts/task-planning.integration.test.ts:384` | 自动断言通过；不扩大为语义或真人身份保证 |
| T10 | `packages/cli/test/scripts/task-planning.integration.test.ts:419` | 自动断言通过；不扩大为语义或真人身份保证 |
| T11 | `packages/cli/test/scripts/task-planning.integration.test.ts:427` | 自动断言通过；不扩大为语义或真人身份保证 |
| T12 | `packages/cli/test/scripts/task-planning.integration.test.ts:445` | 自动断言通过；不扩大为语义或真人身份保证 |
| T13 | `packages/cli/test/scripts/task-planning.integration.test.ts:460` | 自动断言通过；不扩大为语义或真人身份保证 |
| T14 | `packages/cli/test/scripts/task-planning.integration.test.ts:501` | 自动断言通过；不扩大为语义或真人身份保证 |
| T15 | `packages/cli/test/scripts/task-planning.integration.test.ts:512` | 自动断言通过；不扩大为语义或真人身份保证 |
| T16 | `packages/cli/test/scripts/task-planning.integration.test.ts:540` | 自动断言通过；不扩大为语义或真人身份保证 |
| T17 | `packages/cli/test/scripts/task-planning.integration.test.ts:561` | 自动断言通过；不扩大为语义或真人身份保证 |
| T18 | `packages/cli/test/scripts/task-planning.integration.test.ts:575` | 自动断言通过；不扩大为语义或真人身份保证 |
| T19 | `packages/cli/test/scripts/task-planning.integration.test.ts:589` | 自动断言通过；不扩大为语义或真人身份保证 |
| T20 | `packages/cli/test/scripts/task-planning.integration.test.ts:600`；`packages/cli/test/scripts/task-planning.integration.test.ts:630` | 自动断言通过；不扩大为语义或真人身份保证 |
| T21 | `packages/cli/test/scripts/task-planning.integration.test.ts:655` | 自动断言通过；不扩大为语义或真人身份保证 |
| T22 | `packages/cli/test/scripts/task-planning.integration.test.ts:677` | 自动断言通过；不扩大为语义或真人身份保证 |
| T23 | `packages/cli/test/scripts/task-planning.integration.test.ts:693`；`packages/cli/test/scripts/planning-status.integration.test.ts:220` | 自动断言通过；不扩大为语义或真人身份保证 |
| T24 | `packages/cli/test/scripts/task-planning.integration.test.ts:707` | 自动断言通过；不扩大为语义或真人身份保证 |
| T25 | `packages/cli/test/scripts/task-planning.integration.test.ts:729` | 自动断言通过；不扩大为语义或真人身份保证 |
| T26 | `packages/cli/test/scripts/task-planning.integration.test.ts:748` | 自动断言通过；不扩大为语义或真人身份保证 |
| T27 | `packages/cli/test/scripts/task-planning.integration.test.ts:787` | 自动断言通过；不扩大为语义或真人身份保证 |
| T28 | `packages/cli/test/scripts/task-planning.integration.test.ts:206`；`packages/cli/test/scripts/planning-status.integration.test.ts:245` | 自动断言通过；不扩大为语义或真人身份保证 |
| T29 | `packages/cli/test/scripts/planning-status.integration.test.ts:124`；`packages/cli/test/scripts/planning-status.integration.test.ts:150` | 自动断言通过；不扩大为语义或真人身份保证 |
| T30 | `packages/cli/test/scripts/planning-status.integration.test.ts:162` | 自动断言通过；不扩大为语义或真人身份保证 |
| T31 | `packages/cli/test/scripts/planning-status.integration.test.ts:342`；`packages/cli/test/scripts/planning-status.integration.test.ts:400` | 自动断言通过；不扩大为语义或真人身份保证 |
| T32 | `packages/cli/test/scripts/planning-status.integration.test.ts:372` | 自动断言通过；不扩大为语义或真人身份保证 |
| T33 | `packages/cli/test/scripts/planning-status.integration.test.ts:342`；`packages/cli/test/scripts/planning-status.integration.test.ts:400` | 自动断言通过；不扩大为语义或真人身份保证 |
| T34 | `packages/cli/test/scripts/planning-status.integration.test.ts:306`；`packages/cli/test/templates/planning-contract.test.ts:30` | 自动断言通过；不扩大为语义或真人身份保证 |
| T35 | `packages/cli/test/templates/planning-contract.test.ts:53`；`packages/cli/test/templates/planning-contract.test.ts:74` | 自动断言通过；不扩大为语义或真人身份保证 |
| T36 | `packages/cli/test/templates/planning-contract.test.ts:38`；`packages/cli/test/templates/planning-contract.test.ts:102` | 自动断言通过；不扩大为语义或真人身份保证 |
| T37 | `packages/cli/test/templates/planning-contract.test.ts:53` | 自动断言通过；不扩大为语义或真人身份保证 |
| T38 | `packages/cli/test/scripts/task-planning.integration.test.ts:206`；`packages/cli/test/scripts/task-planning.integration.test.ts:837` | 观察完成，不提供并发保护 |

## P01—P16、M1—M6 与 S0

正式 P01—P16 的逐项结果、退出码和分类直接见 `version-comparison/9b76fe49f19d-1b801471966e/report.md` 及其两侧原始 JSON（结构化数据）文件，未覆盖旧证据。16 主场景均符合版本特定预期；其中 P12、P14 各有两个独立叶子分支。对旧版不支持的命令停止后续流程，没有伪造旧版后续状态。

| 演练 | 已有证据 | 边界及当前结论 |
| --- | --- | --- |
| M1 | `manual-exercise-data.json`、`manual-exercises-review.md` | 三份短材料各有用途；审查者角色模拟完成 |
| M2 | 同上，加 `m2-human-review-pending.json` | 旧确认拒绝和重新展示已准备；新版本真实答复尚未收到，不算最终完成 |
| M3 | `manual-exercise-data.json` | 两时点勘误链模拟完成；不谎称模拟确认是真人消息 |
| M4 | `manual-exercise-data.json` | 实际依赖临时进程先停止，再回规划；其他授权内容为模拟 |
| M5 | `manual-exercise-data.json` | 语义矛盾反例已保留；机器通过不能替代审阅 |
| M6 | `manual-exercise-data.json` | 虚假确认、伪勘误、指令式文字能力反例已记录；不声称能验证身份 |
| S0 | `bootstrap-sequence-audit-final.json` | A 自身展示、真实授权、指纹、开工顺序有可回查实际会话记录 |

## 未关闭项与限制

- M2 仅在展示具体隔离版本并取得新真实答复后，才执行版本绑定开工、读回批准和副作用，随后停止。旧批准是合成设置，不能声称“两轮真人批准”。
- 全量测试为核心 398 通过/2 跳过，命令行 1987 通过/17 失败/35 跳过；17 项旧失败集合相同，没有 A 新增失败，但全量不通过。
- 新独立证据复核工具启动失败；主会话一致性检查不替代独立审查。既有核心 96 项、平台 19 项独立复审保留各自范围。
- 最后证据提交、提交前范围检测和最终完整性读回尚需完成。不推送、不归档、不实施 C。
