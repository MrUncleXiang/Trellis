# 调研依据保存与交接：场景行为验证结果

日期：2026-11-12
状态：已完成首轮行为验证；AC4 首轮失败保留，新版恢复入口复验通过；AC1 最新版完整会话重验通过，先前两次中断保留。本文只记录实际运行和可核对证据，不用文件存在或关键词命中代替行为结论。

## 1. 运行环境与版本差异

| 项目 | 实际值 |
|---|---|
| 宿主 | Codex CLI（编程代理命令行）0.154.0，非交互 `codex exec --json` |
| 模型 | 用户配置默认 `gpt-6.1-sol`；未指定不同模型 |
| 推理强度 | `low`；AC1 首次使用 `medium` |
| 运行方式 | 每次新进程、新会话；临时目录是独立 Git 仓库；提示从 stdin 传入（`child.stdin.end()`） |
| 隔离项目（首轮） | `C:/Users/PXWD/AppData/Local/Temp/trellis-beh-final-1794456051007` |
| 隔离项目（新版复验） | `C:/Users/PXWD/AppData/Local/Temp/trellis-beh-current-1794457512878`；AC4 新版样例 `C:/Users/PXWD/AppData/Local/Temp/trellis-beh-ac4v2-1794458423336` |
| 固定资料 | 全部为虚构或受控样例；未联网搜索 |
| 钩子 | 多数批次显式 `features.hooks=false`；AC1 首次批次启用了功能钩子并通过信任绕过参数 |
| 全量测试 | 本检查代理未运行全库测试、未构建、未提交 |

### 版本差异（必须区分）

- 首轮 AC1、AC3、AC6、AC8 等运行使用了较早的 `dist`（构建产物）。
- 之后模板按 Pascal 审查补充了三处恢复/规划语义，最新 `dist` 中以下三个生成文件与旧运行所用版本不同：
  - `.agents/skills/trellis-continue/SKILL.md`
  - `.agents/skills/trellis-start/SKILL.md`
  - `.agents/skills/trellis-brainstorm/SKILL.md`
- 当前 `dist` 生成 22 个平台入口，`codex` 平台 54 个文件；当前 22 个平台 `collectPlatformTemplates` 调用无错误。部分平台没有独立 `start`/`continue` 命令文件，规则由 skills 承载，不能把“没有命令文件”直接判为规则缺失。
- AC4 的“恢复入口发现新外部依据时先按 `trellis-brainstorm` 保存”新句已在源码与本次新生成入口中出现；本文把新 dist 的 AC4 复验单独列出，不覆盖首轮失败。

> B-AC1 另有一次最新 `dist` 的完整会话重验，见 3.5；下表首轮记录仍保留，不替换历史失败/中断。

## 2. 结果总表

| 编号 | 实际结果 | 关键证据 | 限制 |
|---|---|---|---|
| B-AC1 | 历史记录：部分通过，研究文件先落盘、主代理回读并要求修正，但会话没有 `turn.completed`；最新完整重验通过，见 3.5。 | `behavior-evidence/runs/ac1b/events.jsonl`；`behavior-evidence/ac1-task/research/queue-persistence.md`；`behavior-evidence/ac1-task/prd.md` | 运行器 300 秒超时后没有最终 `last.txt`；保存时序成立，但整场会话未正常完成 |
| B-AC2 | 通过：需求入口一句话说明无需外部调研，未创建空研究目录/空文件，未联网。 | `behavior-evidence/runs/ac2/events.jsonl`；`task-artifacts/ac2-ui-copy/prd.md`；`runs-current/ac2-current/*` | 执行中仍有本地 `rg` 检索，属于本地核验，不是联网调查 |
| B-AC3 | 通过：离线读取固定依赖，记录包名、版本、源码位置、实验命令、观察和决策影响。 | `task-artifacts/ac3-vendor-batch/research/vendor-batch.md`；`task-artifacts/ac3-vendor-batch/prd.md`；`task-artifacts/ac3-vendor-batch/design.md` | 固定依赖是虚构样例，不代表真实库能力 |
| B-AC4 | **首轮失败（保留），新版复验通过**：首轮只在聊天中给出冲突/未知结论，未创建研究记录、未更新 `prd.md`；新版恢复入口样例中，模型读 `trellis-start`/`trellis-continue` 与新句后读取 `trellis-brainstorm`，先写 `research/revalidation.md` 再更新 PRD，最终正常结束。 | 首轮：`behavior-evidence/runs/ac4/events.jsonl`、`task-artifacts/ac4-conflict-unknown/prd.md`；复验：`behavior-evidence/ac4-revalidation/*` | 首轮失败保留；新版只证明当前模型/宿主的这一场景，不能外推到其他宿主。首轮事件显示它读取了 start/continue 和 Phase Index，未读 `trellis-brainstorm`，属于恢复入口可达但新发现保存规则未触达 |
| B-AC5 | 主代理独立恢复演练 4/4 通过；本检查代理另跑的四会话见补充。 | [recovery-validation.md](recovery-validation.md)；`behavior-evidence/runs/ac5-*`；`behavior-evidence/AC5-handoff-note.md` | 主代理 `start-in_progress` 仅读研究记录、未复核原始依赖说明，不能称独立核实；本检查代理四会话不是只读，`ac5-impl-continue` 写入实施与验证文件是提示“继续实施”的预期结果，不是静默写入 |
| B-AC6 | 通过：复用历史研究而非复制整篇，实际核对当前依赖包、版本和源码后引用历史记录。 | `task-artifacts/ac6-reuse/prd.md`；`task-artifacts/ac6-history/research/compatibility.md`；`behavior-evidence/runs/ac6-reuse/events.jsonl` | `ac6-reuse` 没有新 `research/` 目录是正确的复用结果，不是失败 |
| B-AC7 | 通过：用户资料标为未独立验证，实际运行固定实验，记录环境、命令、输出、脚本摘要，并识别实验输出是写死字符串、没有调用真实导入器。 | `task-artifacts/ac7-user-experiment/research/import-capability.md`；`task-artifacts/ac7-user-experiment/prd.md`；`runs-current/ac7-current/*` | 实验是合成样例，只能证明模型没有把脚本输出冒充真实产品验证 |
| B-AC8 | 通过：新证据先落研究记录，再更新需求、设计、实施计划和任务状态；旧 A 决策标记为被取代。 | `task-artifacts/ac8-new-evidence/research/new-evidence.md`；`task-artifacts/ac8-new-evidence/prd.md`；`task-artifacts/ac8-new-evidence/design.md`；`task-artifacts/ac8-new-evidence/task.json` | 任务状态被改回 `planning`，属于回规划处理；是否由主代理依流程执行需在集成层确认 |
| B-AC9 | 通过（两阶段）：未采用无关浏览时不写研究文件；后来用户明确把笔记定为命名规则后，先保存 `research/naming-rule.md` 再更新入口。 | `runs/ac9/events.jsonl`；`runs-current/ac9-phase2/events.jsonl`；`task-artifacts-current/ac9-unrelated/research/naming-rule.md`；`task-artifacts-current/ac9-unrelated/prd.md` | 两阶段用两个新会话完成，不是同一会话中的两次用户输入；仍能证明“采用前保存” |
| B-AC10 | 通过（语义审查）：仅有链接的记录被判不足，未宣布就绪，列出命题、来源、限制、验收缺口并更新入口。 | `runs/ac10/events.jsonl`；`runs-current/ac10-current/events.jsonl`；`task-artifacts-current/ac10-pseudo/research/pseudo.md`；`task-artifacts-current/ac10-pseudo/prd.md` | 模型把审查说明写入了原证据文件；原内容保留，但“证据”和“审查”同文件，后续可读性略差 |
| B-X1 | 首轮研究返回失败（假凭据复制声称未复制、分片重试建议缺依据）→主代理退回修正→实际读取修正版并完成隔离样例整合；另注入合成坏返回（摘要＋不存在路径），主代理实际读取得到 ENOENT，拒绝集成，规划字节未变。 | [dispatch-validation.md](dispatch-validation.md)；[dispatch-evidence/missing-return-fault.json](dispatch-evidence/missing-return-fault.json)；[dispatch-evidence](dispatch-evidence/) | 首轮失败保留；坏返回是人工注入，不是自然助手输出；没有自动程序门禁；路径通过不等于所有首次交付都合规 |
| B-X2 | 两个研究助手分别写不同主题文件→首轮发现缺陷后退回修正→主代理实际读取并串行整合；规划文件在助手阶段保持不变。 | [dispatch-validation.md](dispatch-validation.md)；[dispatch-evidence](dispatch-evidence/) | 失败与修正过程保留；这是两个独立 CLI 研究角色的受控样例，不是多模型统计，也不证明每次首次交付都遵守 |
| B-X3 | 通过：实施角色只读 `implement.jsonl` 与其中列出的兼容性研究，未读 `check.jsonl` 或无关大文件。 | `runs-current/x3-implement/events.jsonl`；`runs-current/x3-implement/last.txt`；`task-artifacts-current/x3-context/implement.jsonl` | 角色是用独立 CLI 进程模拟，不是宿主原生 `SubagentStart` 注入 |
| B-X4 | 通过：发现引用文件不存在后指出缺口和影响，没有把缺失当成“不支持”，记录实施前检查，未继续实施。 | `runs/x4/events.jsonl`；`runs-current/x4-current/events.jsonl`；`task-artifacts/x4-broken-ref/research/readiness-review.md` | 任务状态仍为 `in_progress`；本场景只验证不静默实施 |
| B-X5 | 通过：拒绝把原始工具日志当作选型依据，实际复核两份来源并保存审查记录。 | `runs/x5/events.jsonl`；`runs-current/x5-current/events.jsonl`；`task-artifacts-current/x5-logs/research/queue-evidence-review.md` | 没有最终选型，这是证据不足时的正确处理 |
| B-X6 | 部分覆盖且静态证据较强：最新 dist 的 22/22 平台均生成 `trellis-brainstorm` 技能与 `research handoff rules` 语义；其中 11 个平台没有 `inject-workflow-state` 钩子，规则仍由技能/工作流承载。Codex 关闭钩子的实际运行也读取了技能规则。 | `behavior-evidence/x6-check.json`；`generation-current.json`（22 平台无错误）；`runs-current/*/events.jsonl`（`features.hooks=false`）；`workflow-rule-layer.json` | 11 个平台只是生成层可达；没有逐宿主运行，不能声称无注入平台的模型行为一致；也没有证据支持“每轮自动提醒” |
| B-X7 | 部分通过：单轮长执行且没有新用户输入时，AC1b 与 `ac5-impl-continue` 都发生了中途保存；AC1b 会话未正常收尾。 | `runs/ac1b/events.jsonl`；`runs/ac5-impl-continue/events.jsonl` | 部分运行没有每工具提醒；不能保证所有长轮都保存 |
| B-X8 | 主代理负责：写失败时报告未持久化、没有换路径、没有把失败当保存；假凭据未被纳入记录。 | [role-evidence/write-failure](role-evidence/write-failure/)；[role-evidence/results.json](role-evidence/results.json) | 由主代理独立角色进程验证，本检查代理不重复 |
| B-X9 | 部分覆盖：native 工作流用真实 CLI 初始化并通过 Phase Index 解析；tdd/channel 的 CLI 初始化在离线环境超时，改用源码直拷贝后 State 块和 Phase Index 可解析。 | `workflow-rule-layer.json`；`workflow-current.json`；主代理另有 native→tdd→channel→native 集成结果 | 规则层可达；不是模型宿主行为覆盖，也不把离线 marketplace 失败说成产品失败 |
| B-X10 | 主代理负责：受控只读绕过运行后只回答，没有新增研究文件，证明本版没有自动捕获器。 | [role-evidence/bypass](role-evidence/bypass/)；[role-evidence/results.json](role-evidence/results.json) | 这是反向边界验证，不是“模型遵守保存规则”的通过证据 |
| B-X11 | 研究角色分支通过：助手只写分配文件、主代理改规划；实施/检查角色通过：报告来源、发现和影响，三个规划文件字节未变；保存失败分支与无捕获对照也在角色验证中通过。 | [dispatch-validation.md](dispatch-validation.md)；[role-validation.md](role-validation.md)；[role-evidence/results.json](role-evidence/results.json) | 角色由独立 CLI 提示模拟，不是原生 `SubagentStart` 全宿主保证 |

## 3. 首轮失败、中断与未运行

### 3.1 首轮失败（必须保留）

1. **B-AC4 首轮失败**：完整读完两份冲突来源和速率资料，在聊天中给出正确方向的判断，但没有保存研究记录，也没有更新 `prd.md` 的 Research 段。文件证据：
   - `research/behavior-evidence/runs/ac4/events.jsonl`
   - `research/behavior-evidence/task-artifacts/ac4-conflict-unknown/prd.md`
   - 该轮读取了 `trellis-start`、`trellis-continue` 和 Phase Index，没有读取 `trellis-brainstorm` 的保存规则。
2. **B-X1/B-X2 首轮研究返回失败**：主代理已报告其中一项输出实际包含假凭据但声称未复制，另一项在没有依据时建议分片重试。失败保留在 [dispatch-evidence](dispatch-evidence/)，未用后续修正覆盖；修正版已由主代理实际读取并完成隔离样例整合，见 [dispatch-validation.md](dispatch-validation.md)。另用合成坏返回注入“摘要＋不存在路径”：主代理实际读取得到 ENOENT，拒绝集成，规划字节未变；该坏返回不是自然助手输出，见 [missing-return-fault.json](dispatch-evidence/missing-return-fault.json)。
3. **AC5 `start-in_progress` 的独立核实限制**：主代理恢复演练中该次实际只读研究记录，没有读原始依赖说明；最终回答没有宣称独立核实，因此保留为“复用记录”，不记作 sourceRead=true。

### 3.2 中断

- **AC1 第一次运行**：工具调用 30 秒上限导致中断，事件只有前 10 条，不判定通过。
- **AC1 第二次运行**：真实执行了研究派发、文件写入、主代理回读和验证命令，但事件流没有 `turn.completed`，`last.txt` 未生成；属于运行器/父进程超时，不是“没有读取 stdin”。证据中能看到提示已被执行，不能归因为等待 stdin。
- **AC5 第一次 `impl-continue` 长时间运行**：后来最终完成并写入 `verification.md`；本报告保留“曾长时间运行”的事实，但以最终 `turn.completed` 的状态记录。

### 3.3 未运行/由主代理接手

- B-X1、B-X2、B-X8、B-X10、B-X11 的正式验证由主代理完成，本检查代理不重复启动。相关证据在 `research/dispatch-evidence/` 与 `research/role-evidence/`。
- 跨 22 个真实宿主的运行未执行；只有生成层检查。不能把 22 个生成入口当成 22 个宿主行为通过。

### 3.4 AC4 新版复验（通过）

- 项目：`C:/Users/PXWD/AppData/Local/Temp/trellis-beh-ac4v2-1794458423336`
- 提示：与首轮相同的业务目标，只查看 `fixtures` 固定资料；没有添加“记得保存”提示。
- 运行：Codex CLI 0.154.0，`gpt-6.1-sol`，`low`，全新进程/会话，退出码 0，`turn.completed=true`。
- 实际读取：`trellis-start`、`trellis-continue`、包含新句的恢复入口、`trellis-brainstorm`、三份固定资料。
- 实际写入：先创建 `research/revalidation.md`，随后更新 `prd.md` 的 `## Research`；研究文件时间 `04:43:55.531`，PRD 时间 `04:43:55.539`。
- 最终回答：明确“暂按 1.2 不支持服务端渲染处理，冲突未消除；请求速率上限未知，不能承诺吞吐量”，没有把资料阅读冒充独立软件包验证。
- 结论：本场景在最新 dist 上通过；首轮失败不删除。证据在 `behavior-evidence/ac4-revalidation/`。

### 3.5 AC1 最新完整会话重验（通过）

- 项目：`C:/Users/PXWD/AppData/Local/Temp/trellis-beh-ac1v3-1794458903115`
- 提示：同一业务目标，只使用一份固定本地资料 `fixtures/docs/queue-choice.md`；未添加“记得保存”提示；要求不做无关仓库探索。
- 运行：最新 `dist` 生成的 `codex` 入口；Codex CLI 0.154.0；`gpt-6.1-sol`；`low`；全新进程/会话；退出码 0；`turn.completed=true`。
- 实际读取：`trellis-start`、`trellis-brainstorm`、任务入口和唯一固定资料；没有读取其他外部资料。
- 实际写入：同一条命令先写 `research/queue-choice.md`，再写 `prd.md`；研究文件时间 `04:49:48.394`，PRD 时间 `04:49:48.395`，研究文件先于需求索引。
- 研究内容：问题、可定位来源与行号、事实 A/B、限制、排除内存队列的理由、文件落盘队列的代价、决策影响、恢复/写盘/崩溃未知与后续验证步骤。
- PRD 入口：`## Research` 引用 `research/queue-choice.md`，说明当前结论、资料日期、未独立验证和未知影响。
- 最终结论：推荐文件落盘队列，排除纯内存队列；明确“推荐不等于已证明不丢任务”。
- 证据：`behavior-evidence/ac1-revalidation/`。

先前 AC1 第一次 30 秒中断和第二次无 `turn.completed` 的记录仍保留在本文件 3.2 与 1/2 节，不删除。

## 4. 关键时序证据

### AC1（研究先落盘、主代理再宣布）

事件顺序：

1. `item 5` 读取 `trellis-start` 技能；
2. `item 7` 读取任务和两份固定资料；
3. `item 11` 实际派发 `trellis-research` 子代理，派发包含 `Active task`、目标文件、问题、来源和最低语义要求；
4. 子代理返回研究文件路径；
5. `item 14` 主代理读取 `research/queue-persistence.md`；
6. `item 15` 主代理指出“恰好一次”不应擅自加入，要求修正；
7. 研究文件修改后，主代理再更新 PRD；
8. 文件时间：研究 `04:07:05`，PRD `04:07:22`，研究先于需求入口更新。

这证明本场景中“先保存、再集成”真实发生；但整场没有正常 `turn.completed`，所以只记为行为部分通过。

### AC4（首轮失败）

- `runs/ac4/events.jsonl` 中实际读到了 `fixtures/docs/conflict-a.md`、`conflict-b.md`、`rate-limit-note.md`；
- 同时读取了 `trellis-start`、`trellis-continue` 和 Phase Index；
- 没有读取 `trellis-brainstorm`；
- 没有写入 `research/`；
- `prd.md` 的 `## Research` 仍是 `Not investigated yet`。

这不是“模型没读到冲突”，而是“恢复入口让模型读到了冲突，但没有把新发现按规划保存规则落盘”。

### AC9（两阶段）

- 第一阶段：读取 `fixtures/unrelated/readme.md`，明确判断该资料不适用于本产品命名，没有建立研究文件；
- 第二阶段：用户明确把“短名词优先”定为命名规则后，创建 `research/naming-rule.md`，在 PRD 中引用并标明旧结论已被取代。

### X3（角色上下文）

`x3-implement` 的事件命令只包含：

- `Get-Content .trellis/tasks/x3-context/implement.jsonl`
- `Get-Content .trellis/tasks/x3-context/research/compatibility.md`
- 创建 `src/batch.js`

没有读取 `check.jsonl`、`research/unrelated-large.md` 或其他报告。说明角色清单的“只选相关记录”行为在本次 CLI 角色模拟中成立。

### 5.1 X6 无状态注入平台（规则层）

最新 `dist` 的 22 个平台中：

- 22/22 平台都能生成 `trellis-brainstorm` 技能，并包含 `research handoff rules` 语义；
- 11 个平台没有 `inject-workflow-state` 钩子：cursor、kilo、antigravity、devin、dsh、pi、reasonix、omp、grok、kimi、snow；
- 这些平台上的规则仍然由技能/工作流文件承载，但“每轮自动提醒”没有生成证据。

因此 X6 的结论是“规则可达，自动提醒未覆盖”，而不是“无注入平台与事件平台同等能力”。原始检查见 `behavior-evidence/x6-check.json`。

## 5. 宿主与运行器限制

1. **全局技能/插件噪声**：Codex 用户级 skills 与 MCP 服务仍被加载，虽然后续命令关闭了部分 MCP，模型仍能看到较多无关技能描述。这不影响“实际运行”事实，但降低环境纯净度。
2. **Codex 钩子**：多数批次显式关闭钩子，以验证拉取式技能/工作流路径；没有把关闭钩子等同于另一个宿主。
3. **`codex.ps1` 包装**：直接对该 `.ps1` 做 `spawnSync` 得到 `EFTYPE`；通过 PowerShell 执行帮助返回 0 但标准输出为空；改用同一 CLI 的 `codex.js` 入口后正常得到版本 0.154.0 与完整帮助。这是运行器差异，不是产品行为。
4. **首个冒烟会话**：status 0，thread id `01a1cde6-eb4a-7763-87fb-2e89857aa97a`，真实返回 `SMOKE_OK`。
5. **AC5 本检查代理的补充批次不是只读**：`ac5-impl-continue` 的提示是“继续实施”，因此它写入 `caller/render-batch.mjs`、测试、`verification.md` 并更新计划与研究报告是预期结果；不能把它当成只读恢复演练，也不能与主代理的只读 4/4 混为一谈。

## 6. 当前结论

- **行为层不能整体宣称通过**：AC4 首轮真实失败已保留，新版复验通过；X1/X2 首轮有研究返回失败，X6/X7/X9 只是部分覆盖。
- **可确认的行为**：AC1 已由最新版完整会话重验通过（退出 0、`turn.completed`、研究文件先于最终结论和 PRD 索引），先前两次中断保留；AC2、AC3、AC6、AC7、AC8、AC9、AC10 在对应样例上出现了预期保存/复用/复查行为；AC5 的主代理只读恢复演练 4/4 可读取研究，但其中一项没有原始来源复核。
- **规则可达不等于行为保证**：22 平台生成、工作流 State 块、技能入口可达，只证明规则进入产物；不能替代真实模型在每种宿主上的遵守。
- **本版边界**：没有自动捕获器；X10 的只读绕过只证明没有后台自动保存，不证明模型在正常任务中一定保存。

## 7. 历史失败与当前结论的区别

历史失败记录不等于当前产品仍然失败，也不自动等于当前产品已通过：

- **AC1、AC4**：已用最新 `dist` 在全新隔离样例重验；AC1 保持选型目标但缩小为单一固定资料，AC4 沿用相同业务提示；受影响场景当前通过，历史中断/失败继续保留为过程证据。
- **X1、X2**：首轮失败后经主代理退回修正，主代理实际读取修正版并完成隔离样例整合，当前路径通过；X1 的缺文件/仅摘要分支已用合成坏返回注入，主代理实际得到 ENOENT 并拒绝集成，但不是自然助手输出的统计证据。
- **X6、X7、X9**：部分覆盖表示“尚未证明全宿主/全模型保证”，不是当前产品在这些场景已被判失败。
- 只有同一场景、同一受影响版本重新验证通过，才更新该场景的当前判定；不能用其他场景成功替代。

## 8. 证据索引

- 首轮运行目录：[runs](behavior-evidence/runs/)
- 新 dist 补充运行：[runs-current](behavior-evidence/runs-current/)
- 首轮任务产物：[task-artifacts](behavior-evidence/task-artifacts/)
- 新 dist 任务产物：[task-artifacts-current](behavior-evidence/task-artifacts-current/)
- 生成覆盖：[generation.json](behavior-evidence/generation.json)、[generation-current.json](behavior-evidence/generation-current.json)
- 版本差异：[version-compare.json](behavior-evidence/version-compare.json)
- 工作流规则层：[workflow-rule-layer.json](behavior-evidence/workflow-rule-layer.json)、[workflow-current.json](behavior-evidence/workflow-current.json)
- 主代理恢复证据：[recovery-validation.md](recovery-validation.md)
- 主代理派发证据：[dispatch-evidence](dispatch-evidence/)
- 主代理角色证据：[role-evidence](role-evidence/)


## 2026-11-12 提交前同条件补充

用户要求后补齐旧新版同条件对照，真实结果见[完整报告](paired-comparison-results.md)。26对输入逐字一致，60次会话全部完成；最终材料关键内容旧25/26、新26/26，包含保存时序的约定旧10/26、新12/26。新版14/16新增依据场景仍在保存前发表判断，不能把最终文件齐全写成时序通过；本轮不为提高数字修改提示重跑。

完整旧新版对照取代此前“尚无同条件数据”的现状描述；早期修正复验仍为历史证据。
