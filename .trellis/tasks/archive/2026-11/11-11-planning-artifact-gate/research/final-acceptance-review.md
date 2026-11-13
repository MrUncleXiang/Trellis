# A 最终覆盖审阅（2026-11-13）

> 本报告只读形成，不修改产品、冻结规划或旧证据。审阅对象是当前 `codex/planning-artifact-gate` 工作区中的 A 交付材料。

## 结论

**当前状态：条件性通过实现覆盖，尚未完成最终正式验收。**

没有发现新的实现级阻断；R1—R11 的主体实现、T01—T38 的自动化覆盖、M1—M6 的角色演练和 S0 的真实主会话顺序证据基本齐全。但以下两项不能在当前材料上关闭：

1. **B7.3 的正式固定 SHA 对照尚未执行。** 现有 16 旧/16 新开发自检是未提交工作区的开发验证，不是提交后的 P01—P16 正式证据；`research/version-comparison/` 尚无正式结果目录。
2. **M1—M6 是审查者主导的合成角色演练，不是真实人类重新确认。** 数据明确标记 `realUserReply: false`。这能满足“角色模拟、能力反例、诚实边界”的约定，但不能作为 R3 真实用户批准或 M2“真实批准靠演练”的真人证据。

因此，不能把 A 标记为“全部验收通过”或把未固定的新版提交算作已完成。

## 已核对证据

### R1—R11 与 T01—T38

已存在的自动化证据显示：

- 核心定向测试：`task-planning.integration.test.ts` 覆盖 T01—T28 与 T38，并加入坏记录、空值和默认参数反例。
- 状态与平台链路测试：`planning-status.integration.test.ts` 覆盖 T29—T33、完成态和坏记录回归。
- 模板分发与来源测试：`planning-contract.test.ts` 覆盖 T34—T37。
- 最近一次专项运行：3 个测试文件、115 项通过，见 `recovered-core-and-boundary-current.txt`。
- 核心 96 项复审和平台最终 19 项复审均由独立审查者复核并追加了结果。
- `T38` 仍然只是并发观察，不作为并发保护通过；主会话串行写入边界没有被改变。

### B0—B7

- **B0**：`bootstrap-sequence-audit-final.json` 包含真实主会话来源文件、消息行号和时间顺序，记录“展示最终审阅版本 → 用户目标事件 → 开工前指纹检查 → 旧 start 退出 0 和 `in_progress` 回读 → 独立进度记录”。该文件还明确说明 manifest 的 `userApproval.receivedAt` 是后续记录时间，不是原始用户事件时间。
- **B1—B6**：实现、测试和 M1—M6 材料存在。`manual-exercise-data.json` 记录 M1—M6 六组演练的实际命令、前后哈希、状态、指针和钩子。
- **B7.1**：`compare-planning-versions.py` 使用完整 40 位提交，导出固定模板树，要求两个不同提交且新版必须含 `common/planning.py`；输出目录已有非空内容时拒绝覆盖。
- **B7.2**：全量 `pnpm test` 为 core `398 passed / 2 skipped`，CLI `1987 passed / 17 failed / 35 skipped`。`full-failure-attribution-final.json` 显示最新 17 个失败与旧基线失败集合完全一致，`newFailures: []`。这是“共同旧失败已归因”，不是“全量测试通过”。
- **B7.3 的 Python 3.9 最小链路已完成**：`final-checks-exit-codes.json` 中 `python39Smoke: 0`，`python39-smoke-current.json` 记录 `attest → validate → 带版本 start → planning-status` 四次退出码均为 0。**正式固定新版提交后的 P01—P16 尚未执行。**
- **B7.4 之前的质量检查**：build、lint、TypeScript typecheck、Python 类型检查和 Python 3.9 smoke 均为 0；冻结材料、两套脚本对和受保护原有路径的完整性检查也通过。

### 生成副本与完整性

- `integrity-recovered-final.json`：5 份冻结材料 `frozenUnchanged: true`，29 个脚本对 `allScriptsIdentical: true`，46 个受保护原有路径 `originalUnchanged: true`。
- `generated-final-verification.json`：78 个授权生成路径全部 `matched: true`。
- 这些结果支持“来源修改没有被生成副本绕过”，但不替代固定提交后的正式对照。

## M1—M6 与 S0 证据判断

### M1—M6

`manual-exercise-data.json` 包含 M1—M6 全部六组，且每组 `kind` 均为 `reviewer-led synthetic role exercise`，所有组均为 `realUserReply: false`。这与 `manual-exercises-review.md` 的声明一致。

- **M1**：三份短文件、attest、validate 通过；证明“短文本可送审”，不证明内容语义正确。
- **M2**：本地存储改为远程上传后，旧版本 `start` 被拒绝，任务保持 `planning`；示例明确停止，没有真实用户重新确认。它能证明旧确认不能覆盖新版本，不能证明真实人类确实被重新询问并同意。
- **M3**：只改“归挡/归档”，前后指纹链和 reviewId 保持；这是合成回复，不是人类身份证据。
- **M4**：依赖进程在 replan 前被审查者显式终止，独立进程继续；文件记录清楚说明产品没有自动停进程能力。
- **M5**：本地要求与远程设计矛盾仍能通过结构检查；审查者指出语义矛盾，符合“指纹不等于语义一致”的边界。
- **M6**：假确认、伪勘误、指令式文字均作为负能力反例；没有声称能验证身份或自动抵抗模型指令。

**判断：满足冻结测试计划定义的审查者主导角色演练和负能力演示；不满足“真实用户重新确认”的真人验收表述。** 主会话必须把 M2 的真实重确认单独列出为未执行，或补一次真实用户答复后重新记录；不能把合成字符串当成 R3 证据。

此外，`manual-exercises-run.txt` 第一次运行因模板路径拼接错误失败；后续 `manual-exercise-data.json` 是恢复运行的数据。两者都没有伪造成功，但最终报告应注明“首跑失败、恢复运行”，避免把恢复数据写成一次无故障的原始演练。

### S0

`bootstrap-sequence-audit-final.json` 的来源是主会话实际记录，不是合成对话，含：

- 展示最终审阅版的消息及出处；
- 用户的实施目标事件；
- 开工前五份文件指纹检查；
- 真实旧 `start` 退出 0、状态和分支回读；
- 后续独立进度记录。

这满足 B0/D9 的“真实来源、顺序、旧工具自举、不用未来命令制造批准”要求。限制是：manifest 时间戳是后补记录时间；且 `user_goal` 事件是主会话内部用户目标事件，不是独立身份认证。两者均已在审计文件中披露，因此不得升级为“程序验证了真实身份”。

## 对照脚本结构与分类

`compare-planning-versions.py` 的结构符合测试计划：

- `resolve_complete_commit` 拒绝短 SHA、非提交和同名前后版本。
- `git archive` 导出两个提交的模板树，不在比较过程中改源仓库。
- 结果目录使用 `before12-after12`，已有非空目录拒绝覆盖。
- `make_fixture` 为两版使用同一数据生成函数和独立临时 Git 仓库。
- `capability_absent` 只允许旧版 argparse 退出 2 出现在“命令不存在”路径，新版不会获得该豁免。
- `comparison_category` 区分预期改善、保留、明确行为变更、新增能力、共同失败和意外回归；共同失败和意外回归会使状态成为 `complete-with-findings`。
- `write_report` 生成 `environment.json`、逐行 `report.md`、`comparison.json` 和 before/after 原始证据；失败时写 `failure.json` 并保留 `executionStatus: failed`。
- 开发自检 32 行（16 个旧版 × 16 个新版）全部达到版本特定预期，记录于 `comparison-harness-development-final-run.txt`。

**判断：脚本结构、分类逻辑和防覆盖设计正确。唯一缺口是尚未用固定新版提交执行正式 P01—P16。**

## 失败归因与全量测试

`full-failure-attribution-final.json` 明确：

- 旧基线失败 17 项；
- 最新失败 17 项；
- `newFailures: []`；
- `oldNotFailingNow: []`；
- `sameFailureSet: true`；
- 当前统计为 `1987 passed, 17 failed, 35 skipped`。

这表明没有 A 引入的新失败，但不能表述为全量绿色。尤其 `upgrade`、旧环境去重、上下文注入限额、OpenCode 条目和原子写相关失败均为共同旧基线问题。

## R1—R11/D1—D9/B0—B7 覆盖判断

| 范围 | 判断 | 说明 |
| --- | --- | --- |
| R1/R6 | 主体已交付 | 三文件、UTF-8、非空、拒绝副作用和上下文绕过边界有测试。 |
| R2/R4/R7 | 主体已交付 | 声明、严格整数、勘误链、validate/start/archive 复用和坏记录反例已覆盖。 |
| R3/R5/R8 | 主体已交付，M2 真人证据不足 | 旧确认拒绝、回规划、旧任务恢复和完成态规则有证据；真实用户重新确认未演练。 |
| R9/R10 | 主体已交付 | create、两树一致、来源生成、78 个生成路径和平台回归有证据。 |
| R11 | **未完全关闭** | T01—T38、M1—M6 已有证据；正式固定 SHA 的 P01—P16 尚未生成，不能算 R11 完成。 |
| D1—D7 | 主要实现路径已核 | 无新阻断；D4 的并发只保留观察边界。 |
| D8/D9 | 审计材料已核 | S0 为真实来源记录；M2/M3/M6 明确是合成演练，不升级为真实用户身份证据。 |
| B0—B6 | 已核，M2 真人重确认未完成 | 实现、反例、角色演练和完整性证据存在。 |
| B7 | **部分完成** | Python 3.9、构建、质量检查完成；B7.3 固定提交正式对照未执行；B7.4 最终验收不能提前关闭。 |

## 最终可行动结论

**可以判定：A 的实现主体和当前工作区专项证据已达到可交付前的技术完整性，没有发现新的核心实现阻断。**

**不能判定：A 已完成最终验收或可以宣称全部测试通过。** 尚缺：

1. 创建并固定包含 A 实现的新版完整提交 SHA；
2. 使用该固定 SHA 执行正式 P01—P16，生成 `research/version-comparison/<before12>-<after12>/`、`report.md`、`comparison.json`、before/after 原始结果和失败归因；
3. 若要把 M2 作为 R3 的真人重新确认证据，补一次真实用户答复和可回查来源；否则明确将 M2 限定为角色模拟；
4. 保留共同 17 项旧失败，不把它们写成通过；在提交前完成最终变更范围检查；
5. 不修改冻结规划，不在未固定 SHA 时声称 B7.3 或 R11 已关闭。

本报告不覆盖平台其它子场景、真实用户身份认证、文本语义判断或同任务并发保护。


## 主会话后续核查补记（2026-11-13，非新增独立审查）

原报告描述的是实现提交前状态，原文予以保留。现在已固定 A 实现提交 `1b801471966e8fb898d0c33e1b025aad2a86f5db`，正式 P01—P16 已执行并完成，无意外结果。因此原报告的“固定新版提交”“正式对照”两项缺口已经关闭，B7.3 的版本固定和对照要求已有真实证据；不得再描述为未执行。

证据入口：`version-comparison/9b76fe49f19d-1b801471966e/report.md`、`formal-comparison-consistency-audit.json`、`pinned-implementation-exit-codes.json`、`pinned-python39-final.json`、`acceptance-coverage-checkpoint.md`。这些补记由主会话核查形成；新增独立复核因工具默认模型不可用未启动，没有新增独立通过结论。

R1/R2/R4—R10 的既有实现证据及正式对照未出现新阻断。R3 的 M2 真实新版本确认仍待完成，故 R11/B7.4 和任务最终验收继续保持未关闭。17 项共同旧失败仍保留，不表示全量通过。五份规划继续冻结，不能为更新进度而改动。


## 最终验收补记（2026-11-13，已取得 M2 真实答复）

- 用户在展示完整隔离版本 `c4eb6574fa664ef3a770c94db22aa5cd`、变化及仅登记开工核验的范围后，实际回复“同意。”。答复原文和可回查来源保存于 `m2-human-reply.json`，没有编造消息编号，也没有挪用提交例外的旧答复。
- 重新核对三个规范化文件指纹、固定实现脚本字节和原规划状态后，仅执行一次版本绑定开工。校验、开工、状态查询、再校验四步全部退出 0。最终状态为实施中，批准版本、指纹、原文和出处完全对应，回规划记录清除，未知键保留，启动钩子新增一次；此后只读核对并停止，无上传、无真实产品方向变化。
- 首轮辅助核验有一条错误断言：错误要求成功开工后整份会话指针记录不变。原始失败保留于 `m2-human-reconfirmation-result.json`。按冻结设计复核，成功开工允许刷新会话时间等字段，文件及目标任务未变；没有修改产品或重跑开工。完整后续核查为 `m2-human-reconfirmation-verification.json`，报告为 `m2-human-reconfirmation-report.md`。旧版批准是合成设置，本次只补新版本真人答复，不声称两轮真人批准。
- 本轮重新执行三份专项测试：115/115 通过、3/3 文件通过，退出 0。日志 `m2-closure-focused-tests.txt`，精确原字节另存压缩包。没有因为文档证据追加重复执行已固定提交的完整全量测试；已知全量结果仍有共同旧失败 17 项，不是全量通过。
- 最终完整性核对：五份冻结规划未变、29 对脚本一致、78 个此前真实生成器核对的文件仍与固定实现一致、原仓库 46 个保护路径未变、子模块提交及工作区干净、A 产品代码在实现提交后无新增差异。见 `final-acceptance-integrity.json`。
- R1—R11、B0—B7 的实现与验收证据至此已齐备，采用用户明确接受的 17 项旧失败提交例外。既有核心/平台独立复审继续按各自范围使用，没有新独立最终复核成功的声明。最终结论见 `final-acceptance-result.md`。
- 本轮只进行最后 A 证据提交和提交后读回。没有推送、归档、实施 C。真实任务 `task.json` 保持 `in_progress` 是既有“归档时才切完成状态”的工作流行为，不为更新进度篡改冻结材料或自行扩展授权。
