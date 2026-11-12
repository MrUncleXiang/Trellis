# B 实施一致性复审（只读）

日期：2026-11-12。范围：任务 `prd.md`、`design.md`、`implement.md`、`research/scenario-validation-plan.md`，五份通用入口，以及默认、native、tdd、channel 四份工作流。方法是文本对照、当前工作树差异和行号核验；未改产品文件，未重跑构建或测试。

结论：**不能判为完全一致通过。** 发现 2 个阻塞项、1 个一般项。主链路、角色边界、路径根相对、恢复入口和无 `prd.md` 分支总体已对齐。行为场景仍未执行，不能把本轮文本复审当作行为验收。

## 1. 缺陷表

| 编号 | 级别 | 位置 | 问题 | 依据与影响 |
|---|---|---|---|---|
| B-IC-01 | 阻塞 | `packages/cli/src/templates/trellis/workflow.md:379`；`marketplace/workflows/native/workflow.md:379`；`marketplace/workflows/tdd/workflow.md:370`；`marketplace/workflows/channel-driven-subagent-dispatch/workflow.md:236` | “Return and integration”只要求主代理核对问题、来源、限制、决定影响，未明确核对**结论**和**事实/推断/未知的区分**。 | `design.md:93` 要求检查“问题、来源、结论/限制、决定影响及事实/推断/未知”；`research/scenario-validation-plan.md:47` 的 B-X1 同样要求这些字段。当前文字允许含混记录被当作已验收，削弱 B6/B7 和 B-X1。 |
| B-IC-02 | 阻塞 | `packages/cli/src/templates/trellis/workflow.md:389-396`；`marketplace/workflows/tdd/workflow.md:380-387`；`marketplace/workflows/channel-driven-subagent-dispatch/workflow.md:224-231`；`packages/cli/src/templates/common/skills/brainstorm.md:23-29` | 九份 Markdown 均未明确要求剔除凭据、个人数据或无关原始负载，也没有“只保存必要事实和可访问出处”的边界。 | `design.md:144` 明确要求仅保存必要事实、剔除凭据和无关个人数据；`research/scenario-validation-plan.md:54` 的 B-X8 要求该场景成立。当前实现规则无法完整推出该边界。 |
| B-IC-03 | 一般 | `packages/cli/src/templates/common/commands/start.md:47`；`packages/cli/src/templates/common/commands/continue.md:36` | “Recheck key premises and versions, and whether unresolved unknowns affect the agreed result. If they do...”中的 “they” 指代不明，可能只被理解为“未解决未知”，漏掉“关键前提失效或版本不适用”的返回规划条件。 | `design.md:96,139` 要求关键前提失效或版本前提不明时回规划。建议改成“If a key premise no longer applies, or an unresolved unknown affects the agreed result, return...”。 |

## 2. 九份 Markdown 与任务要求映射

| 文件 | 已落实内容 | 依据 |
|---|---|---|
| `packages/cli/src/templates/common/skills/brainstorm.md` | 外部依据触发、及时保存、来源定位、事实/推断/未知、无需/复用/已调查、`## Research` 索引、设计决定旁引用、就绪复查；保留仓库证据优先和原授权门槛。 | `brainstorm.md:21-29,66,159,190`；`prd.md:32-83` |
| `packages/cli/src/templates/common/skills/before-dev.md` | 读取 `prd.md` 的 Research 索引及影响实施的研究；确认版本和关键前提；缺失、不可读或过期影响实现时回规划。 | `before-dev.md:6-7,27,38`；`design.md:97` |
| `packages/cli/src/templates/common/skills/check.md` | 读取研究记录；按关键决定核对引用、来源、版本/限制、未知处理，并区分事实/推断/未知。 | `check.md:18-19,61-66`；`design.md:98` |
| `packages/cli/src/templates/common/commands/continue.md` | 已有任务在规划审阅或继续实施前读取 Research 和所需引用；影响约定结果时回规划；无 `prd.md` 保留原路由。 | `continue.md:27-36`；`design.md:96` |
| `packages/cli/src/templates/common/commands/start.md` | 与 `continue.md` 同语义，覆盖另一条新会话恢复入口。 | `start.md:39-47`；`design.md:96` |
| `packages/cli/src/templates/trellis/workflow.md` | 1.2 保存/派发/主代理读取验收；1.3 角色清单；1.4 就绪复查；2.1/2.2 实施与检查消费；2.3 新证据回规划；四个状态块含角色限定提醒。 | `workflow.md:208,222,243,255,378-396,421,461,482,500,557,590` |
| `marketplace/workflows/native/workflow.md` | 与默认模板同语义；当前 SHA-256 与主模板相等。 | `native/workflow.md:208,222,243,255,379,396,421,461,482,500,557,590`；当前哈希相等 |
| `marketplace/workflows/tdd/workflow.md` | 保留行为切片、公共接口和 mock 边界等 TDD 特色，同时加入相同研究语义。 | `tdd/workflow.md:362-387,451-474,492,567,605` |
| `marketplace/workflows/channel-driven-subagent-dispatch/workflow.md` | 保留 channel worker 派发特色，同时加入研究保存、返回验收、角色边界、回规划和清单路径根相对。 | `channel-driven-subagent-dispatch/workflow.md:224-246,250,263,280,321,366` |

补充：`marketplace/.gitattributes:1-2` 仅约束 `workflows/native/workflow.md` 为 LF，符合“保障 native 镜像字节相等”的说明；不改变运行机制。

## 3. 已核对且未发现冲突的项

- **角色越权**：主会话保存并集成；研究代理只写分配的研究范围；实施/检查代理只报告来源、发现和影响，不因通用提醒改写任务规划。见 `workflow.md:243-255,379,500`，以及 `channel...:236,280`。
- **路径根相对**：任务文档链接按所在文档目录解析，`implement.jsonl` / `check.jsonl` 的 `file` 按仓库根解析。见 `workflow.md:395`、`brainstorm.md:27`、`channel...:246`。
- **研究派发验收**：已有 `Active task:` 前缀、具体问题、目标研究文件、最低内容、任务不明返回主代理。见 `workflow.md:378-379`；`tdd:369-370`；`channel:235-236`。
- **无 `prd.md` 分支**：`start.md:47` 和 `continue.md:36` 均明确保留原路由，不要求读取不存在的研究。
- **规划状态**：`prd.md:7-13`、`design.md:3`、`implement.md:3` 均已写为实施中，未把历史“规划中”状态当当前冲突。
- **既有测试兼容修正**：`brainstorm.md:66` 保留原句 `Run the requirement convergence gate, then the PRD convergence pass.`，并追加研究交接复查；不是当前缺陷。

## 4. 未审查与限制

- 未重跑构建、测试或真实平台生成检查；主代理报告的 `core 398` / `CLI 1879` 仅作为其测试状态，不作为本报告的行为验收。
- 未检查所有平台生成副本逐字一致，未检查真实项目更新和三种工作流切换。
- 未运行 B-AC1—B-AC10、B-X1—B-X11；行为时序、新会话接手、研究代理真实派发、无事件平台降级均未验证。
- 未修改产品文件、测试、生成副本或任务其他材料。

## 5. 复审结论

文本主链路一致，但 **B-IC-01 和 B-IC-02 未修复前不能判为实施一致性通过**。修复应优先落在四份工作流的研究派发/交接规则及 `brainstorm.md` 的保存边界，再补一处恢复入口措辞；修复后只需复核受影响文本，并继续保留行为场景为“未运行”。


## 6. 修正后复查（2026-11-12）

回读范围仅限受影响文本：四份工作流的 Return and integration、Decision evidence and handoff，`brainstorm.md` 的保存边界，`start.md` / `continue.md` 的恢复条件。未重新广读，未跑测试。

| 初审编号 | 复查结果 | 证据 |
|---|---|---|
| B-IC-01 | **已修复** | 默认 `workflow.md:379`、native `:379`、tdd `:370`、channel `:237` 均改为核对“问题、来源、结论和限制、决定影响，以及事实/推断/未知的区分”，并保留文件实际读取和缺失退回要求。 |
| B-IC-02 | **已修复** | 默认 `workflow.md:390`、native `:390`、tdd `:381`、channel `:225` 及 `brainstorm.md:23` 均明确只保存必要事实和可访问来源标识，移除凭据、无关个人数据，尊重项目访问边界，不保存无关原始请求/响应负载。 |
| B-IC-03 | **已修复** | `start.md:47`、`continue.md:36` 改为“If a key premise no longer applies, a required version is unverified, or an unresolved unknown affects the agreed result, return...”，三种回规划条件均明确。 |

补充核验：默认工作流与 native 镜像当前 SHA-256 相等（`8A3EF9F92414B215C98BEC8F7565066802AA00D748ED88C76E8486F033011D9D`），`marketplace/.gitattributes` 的 LF 约束仍在。TDD 和 channel 变体的研究派发、角色边界及变体特色未被修复动作移除。

复查结论：三个初审缺陷均已在源文本修复，先前“不能判为完全一致通过”的阻塞已解除。本结论仅覆盖上述文本一致性；真实生成、受影响测试、项目更新、工作流切换及 B-AC1—B-AC10 / B-X1—B-X11 行为场景仍未由本报告验证。
