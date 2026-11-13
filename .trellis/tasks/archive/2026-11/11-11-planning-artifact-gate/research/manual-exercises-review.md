# M1-M6 and S0 review

Date: 2026-11-13. These are reviewer-led, synthetic role exercises using the real task command in isolated repositories. They are not a live user acceptance session. `run-manual-exercises.py` and `manual-exercise-data.json` preserve exact inputs, displayed version fingerprints, commands, outputs and resulting records. The embedded reply/source values explicitly say fixture-only. No human message identifiers were invented.

| Case | Observed evidence | Review conclusion |
| --- | --- | --- |
| M1 | Three distinct one-sentence files; attest and validate succeed without approval. | Requirements, solution rationale and execution are separately readable. No word count or mandatory headings are necessary. |
| M2 | After a synthetic reply for local storage, remote upload changes the design and attestation; old-version start is rejected. | Reviewer flags changed data flow/privacy/network risks. Required user-facing summary is saved; this exercise stops before another approval. A real multi-person conversation was not performed. |
| M3 | Both pre-start and post-start paths replace only the Chinese archive typo; reviewId and reviewedFiles remain, the editorial chain appends, and existing approval remains on the post-start path. | Exact wording diff has no behavior/scope change. Reply strings are synthetic; the program cannot classify meaning. |
| M4 | Separate progress leaves three fingerprints unchanged. Two real temporary jobs start; reviewer explicitly terminates the dependent job before replan, while independent help-spelling job remains alive. | Acceptance change pauses storage-dependent work. Help spelling neither reads storage results nor depends on the design. Product command does not stop workers. |
| M5 | Local-only requirement plus remote-upload solution/plan can attest and validate structurally. | Reviewer rejects semantic contradiction and does not start. Fingerprints are not a semantic alignment check. |
| M6 | Fake reply/source can start; false editorial claim can append a valid chain; instruction-like note remains status data. | Reviewer rejects fake authorization and semantic misclassification. No trusted identity, automatic semantic classification or guaranteed model instruction resistance is claimed. |
| S0 | `bootstrap-sequence-audit-final.json` contains actual displayed R2 review, user objective event, pre-start five-file check, exit-0 start and in_progress readback, and separate progress record in that order. | Real A approval precedes product implementation; old start self-bootstrapped because new commands did not yet exist. The later manifest recording timestamp is not the original user-message time. |

The exercises expose the intended responsibility split. Command tests enforce record shape, version binding and write order; the main-session review compares meaning and real dialogue. Remaining unexercised scope is live human reconfirmation for a fabricated changed requirement and model-wide adversarial robustness, neither represented as machine guarantees.


## 最终验收补记（2026-11-13，已取得 M2 真实答复）

- 用户在展示完整隔离版本 `c4eb6574fa664ef3a770c94db22aa5cd`、变化及仅登记开工核验的范围后，实际回复“同意。”。答复原文和可回查来源保存于 `m2-human-reply.json`，没有编造消息编号，也没有挪用提交例外的旧答复。
- 重新核对三个规范化文件指纹、固定实现脚本字节和原规划状态后，仅执行一次版本绑定开工。校验、开工、状态查询、再校验四步全部退出 0。最终状态为实施中，批准版本、指纹、原文和出处完全对应，回规划记录清除，未知键保留，启动钩子新增一次；此后只读核对并停止，无上传、无真实产品方向变化。
- 首轮辅助核验有一条错误断言：错误要求成功开工后整份会话指针记录不变。原始失败保留于 `m2-human-reconfirmation-result.json`。按冻结设计复核，成功开工允许刷新会话时间等字段，文件及目标任务未变；没有修改产品或重跑开工。完整后续核查为 `m2-human-reconfirmation-verification.json`，报告为 `m2-human-reconfirmation-report.md`。旧版批准是合成设置，本次只补新版本真人答复，不声称两轮真人批准。
- 本轮重新执行三份专项测试：115/115 通过、3/3 文件通过，退出 0。日志 `m2-closure-focused-tests.txt`，精确原字节另存压缩包。没有因为文档证据追加重复执行已固定提交的完整全量测试；已知全量结果仍有共同旧失败 17 项，不是全量通过。
- 最终完整性核对：五份冻结规划未变、29 对脚本一致、78 个此前真实生成器核对的文件仍与固定实现一致、原仓库 46 个保护路径未变、子模块提交及工作区干净、A 产品代码在实现提交后无新增差异。见 `final-acceptance-integrity.json`。
- R1—R11、B0—B7 的实现与验收证据至此已齐备，采用用户明确接受的 17 项旧失败提交例外。既有核心/平台独立复审继续按各自范围使用，没有新独立最终复核成功的声明。最终结论见 `final-acceptance-result.md`。
- 本轮只进行最后 A 证据提交和提交后读回。没有推送、归档、实施 C。真实任务 `task.json` 保持 `in_progress` 是既有“归档时才切完成状态”的工作流行为，不为更新进度篡改冻结材料或自行扩展授权。
