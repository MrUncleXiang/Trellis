# 平台/工作流/分发只读复审

## 结论

截至本报告快照（2026-11-12 21:19 Asia/Shanghai），**不能把 A 的平台分发称为全部通过**。主会话报告的最新 `planning-contract.test.ts` 15/15 通过属实，我独立复跑的结果也是 15/15；主会话报告的 build、64 个生成文件限定同步、A 定向 73/73 通过，以及状态+旧回归 550 通过/5 失败/13 跳过，我未在本次复审中重新运行 build 或全量回归，因此不作为我自己的通过证据。

仍存在两个源文件级阻断点：Copilot 的 check 提示和 OpenCode 的实际注入提示仍保留“design/implement 如果存在”的旧分流；测试没有覆盖这两个入口。另有三个随包发布的 meta 参考文件仍写着 optional / if present，主会话已修的同名文件内容与新要求不一致。修正这些之后，生成副本再限定同步，才能宣称 R10/D6 的平台分发完成。

## 已实际检查的内容

- 读取并核对：PRD R1-R11、design D6/D8、implement 批次5、测试计划 T29-T37、生成的候选清单 `research/generated-a-files.json`。
- 检查源文件：workflow、common skills/commands、Copilot prompts、shared/Codex/Copilot/OpenCode hooks 与 session-utils、`configurators/shared.ts`、`trellis/index.ts`、三个 marketplace workflow、两份 CLI 后端 spec、trellis-meta 的 task-system/change-workflow/context-injection/change-context-loading/platform-files，以及多平台 implement/check agent 源文件。
- 实际执行：
  - `pnpm --filter @mindfoldhq/trellis exec vitest run test/templates/planning-contract.test.ts`：15/15 通过。
  - `pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/planning-status.integration.test.ts`：23/23 通过。
  - Python 启动钩子与 OpenCode JS 的语法检查通过。
- 另跑了一组旧模板测试：shared/codex/copilot 均通过；opencode 测试有 1 个 Windows 路径分隔符旧失败（期望 `refdir/a.md`，实际显示反斜杠）。该失败未归因于 A 新增逻辑，未计入 A 通过。

## 阻断发现

### P1：Copilot check 提示仍允许缺失 design/implement

`packages/cli/src/templates/copilot/prompts/check.prompt.md:23-24` 仍写：

- `design.md` if present
- `implement.md` if present

主会话修了 `before-dev.prompt.md`，但 `check.prompt.md` 是同一平台实际可调用的 shipped prompt；这与 R10“所有平台提示统一取消三文件按轻重任务分流”以及 D6 的接入范围冲突。按新规则，新任务应要求三份文件；仅真正的 legacy 例外可缺材料，提示必须明确该例外，不能用 `if present` 作为通行条件。

测试没有捕获它：`packages/cli/test/templates/planning-contract.test.ts:9-20` 的 sources 列表没有 `copilot/prompts/check.prompt.md`，所以 15/15 不能证明 Copilot 全入口合规。

### P1：OpenCode 实际注入提示仍使用旧分流

`packages/cli/src/templates/opencode/plugins/inject-subagent-context.js:237` 的运行时 implement prompt 仍写“technical design if present, and execution plan if present”。这不是注释；它会拼接到 OpenCode 的 implement 子代理提示中。

同一文件前面的注释已改为 required for new tasks，但实际 prompt 没有同步，形成“注释说新规则、运行时按旧规则”的矛盾。`research/generated-a-files.json` 的 64 个同步路径包含 `.opencode/plugins/inject-subagent-context.js`，所以仅同步生成副本不能消除该源文件问题。

`planning-contract.test.ts:67-78` 的 agent 检查只匹配 `agents/` 或 `droids/`，不会检查 OpenCode plugin 的 runtime template；15/15 通过不覆盖此入口。

### P1：打包 meta 参考仍有旧规则

这些是 `packages/cli/src/templates/common/bundled-skills/trellis-meta/` 的源，不是待同步副本：

- `references/platform-files/agents.md:16` 仍写 `optional design.md / implement.md`。
- `references/platform-files/agents.md:59-60` 仍列 `design.md if present`、`implement.md if present`。
- `references/platform-files/agents.md:77` 仍把两者作为 agent 读取顺序的可选文件。
- `references/customize-local/change-context-loading.md:72-73` 仍写两者 `if present`；主会话修的表格更早位置，未改这里。
- `references/local-architecture/task-system.md:74` 仍写 `optional design.md / implement.md`，与同一文件前面的 “every new task” 表格自相矛盾。
- `references/local-architecture/context-injection.md` 已修源码，但由旧源生成的多个平台副本仍需在源修完后重生成。

这些文件会被打包进 trellis-meta（Trellis 元技能）并影响后续 agent 的读取指令，属于 R10 的“技能/参考”范围，不是无关历史文本。

## 非阻断但必须记录的未覆盖项

### P2：JSON 失败分支的测试覆盖不完整

实现本身是保守的：

- `packages/cli/src/templates/shared-hooks/session-start.py:440-466` 对固定八个字段、mode、字符串/list 和 replan 结构做校验，失败返回 “version check unavailable”，不把文件存在当成可开工。
- `packages/cli/src/templates/opencode/lib/session-utils.js:49-60` 做同类校验。
- 转义在 JSON 序列化后对 `&`、`<`、`>` 做替换，并由 `<planning-record-data>` 单容器承载。

但 `planning-status.integration.test.ts` 的实际钩子用例主要覆盖恶意 note 的转义和 task.py 不存在的不可用路径；本次没有重新运行非 JSON、额外字段、缺失字段、超时等所有 D6/T31 失败子场景。实现代码可判为保守，**测试证据不能宣称这些边界已全部验证**。

### P2：B 研究交接的来源级结论

已核对并保留：

- `packages/cli/src/templates/common/skills/brainstorm.md:21-29` 仍有 Research Evidence Handoff，明确“先保存再展示/采纳”、研究 worker 先落盘再返回、主会话先读再验证。
- `packages/cli/src/templates/trellis/workflow.md:367-397` 仍有 1.2 Research 的保存时机、来源、结论/限制、未决项和交接规则。
- `workflow.md:506` 和 `shared-hooks/inject-subagent-context.py` 仍要求实现/检查读取 research，并把决策变更交回主会话。

未把所有平台生成的 meta 副本逐字重读；在源文件中仍存在上节 optional 文案的情况下，不能宣称 B/R10 的所有生成副本已完成一致性验收。Copilot brainstorm prompt 原本就不是 B 规则的完整副本，本次 diff 没有删除其中的 B 内容，这不作为 A 新引入的回归。

## 已通过或已消除的检查

- **三份材料首次开工**：workflow 的 Phase 1、1.4 与 common commands 已明确新任务三文件；当前源侧不再把复杂/轻量作为省略三文件的开关。
- **真实版本确认**：workflow 1.4 及 common skills/commands 要求 `attest -> validate -> 展示 reviewId -> 用户答复 -> version-specific start`，并保留 D8 的 review-log 追加和真实出处要求。
- **勘误/replan**：common skills 与 workflow 都要求实质变化暂停、replan、更新材料、重新确认；正常实现修错继续。
- **不强制扩写章节**：common brainstorm 的 PRD convergence 改为无损收敛、目标标题可选，workflow 也说明 topics 只是指导，不要求固定章节。
- **marketplace**：native、tdd、channel-driven-subagent-dispatch 的 optional 文案已改为三文件要求；`planning-contract.test.ts` 的 marketplace 检查通过。
- **platform-integration 后部旧矩阵**：当前文件中不再有 `PRD-only` 旧分流；`workflow-state-contract.md:307-309` 明确所有新任务要求三份材料。
- **legacy 例外**：`packages/cli/src/templates/trellis/scripts/common/planning.py:417-422` 只有在 `in_progress/review` 且 `planningAttest`、`planningApproval`、`planningReplan` 三个键都完全不存在时才进入 `legacy_resume`；partial/null 类型为 invalid。planning-status 集成测试的 legacy/partial 场景通过。
- **只读状态查询**：`task.py` 的 `cmd_planning_status` 走读取和 `planning_summary`，没有观察到位移、状态写入或钩子执行；23 个 planning-status 集成测试通过。
- **转义边界**：真实 note 中的 `</planning-record-data>`、`<ready>` 和 `&` 在 shared/codex/copilot/OpenCode 实际路径测试中被编码/转义，未原样形成额外标签。

## 未检项与最终状态

- 未重新运行最新 build，也未独立复核 64 个生成文件在磁盘上的最终内容；只确认 `generated-a-files.json` 为 64 条，且当前 source 仍有上节旧文案。
- 未对主会话报告的 5 个回归失败逐个做基线归因；因此不宣称全量回归通过。
- 未把 `.pi` 等所有非 A 相关的历史副本纳入扩大审查；只记录了与三文件规则直接相关的残留。
- 未重新验证 D9 自举、C 提交来源机制或其他非 A 事项。

**最终判定：平台/workflow 主路径的版本、转义、只读、legacy 和 B 研究交接已基本接入；但 Copilot check、OpenCode runtime prompt 和 trellis-meta 参考源仍有旧分流，R10 不能通过。当前属于“主路径可继续修复、分发验收未完成”，不是最终平台验收通过。**

---

## 修正后定向复审（2026-11-12 21:38）

本节只追加，不改写上节原发现。上节三项 P1 的源文件已修正，但 discovery 检查又发现一个直接违反 R10 的实际生成路径：Pi 的用户技能副本仍保留旧的 optional / if present 文案。

### 上节 P1 的定向复核结果

1. **Copilot check：已修**
   - `packages/cli/src/templates/copilot/prompts/check.prompt.md` 的三份材料读取已不再使用 `if present`。
   - 同一文件包含完整 planning version boundary、editorial 和 legacy 例外；自审/检查时不再把缺失材料视为默认通行。
   - `planning-contract.test.ts` 已将该 prompt 列入源检查。

2. **OpenCode runtime prompt：已修**
   - `packages/cli/src/templates/opencode/plugins/inject-subagent-context.js` 的 implement、check、finish 三个实际 runtime prompt 都要求新任务三份材料；只允许真正的 legacy 恢复使用历史文件。
   - 三者都写明 material change 交回主会话 replan 并重新确认；ordinary fix 继续。
   - 注释、实际文字和 `.opencode/plugins/inject-subagent-context.js` 已同步，新增 runtime prompt 反例测试通过。

3. **trellis-meta 源参考：已修**
   - `references/platform-files/agents.md`、`references/customize-local/change-context-loading.md`、`references/local-architecture/task-system.md` 的源文件中已无旧 optional / if present 表述。
   - `.agents/.claude/.cursor/.opencode/.omp` 五个 meta 生成副本按 `generated-review-fix-sync.json` 的 69 条清单生成；抽查这些副本，旧分流文字已被新规则替换。
   - `.opencode/plugins/inject-subagent-context.js` 与源 hash 一致。

定向测试：独立复跑 `planning-contract.test.ts` 为 **19/19 通过**。主会话报告的红先 **5 失败 / 14 通过**、修正后 **19/19**，与本次结果一致；未重跑全量。

### 仍存在的 P1：Pi meta 用户副本未同步

Pi 的 shared skills 通过 `.agents/skills/` 安装，但工作区还保留了 `.pi/skills/trellis-meta/` 用户副本（不是模板源；上节已列为未覆盖）。当前磁盘上仍是旧文案：

- `.pi/skills/trellis-meta/references/platform-files/agents.md:16`：`optional design.md / implement.md`
- `.pi/skills/trellis-meta/references/local-architecture/task-system.md:74`：`optional design.md / implement.md`
- `.pi/skills/trellis-meta/references/local-architecture/context-injection.md:40`：`design.md if present -> implement.md if present`

这些文件没有出现在 `generated-review-fix-sync.json` 的 69 条清单内，也没有被现有 `planning-contract` 回归扫描。它们是实际可被 Pi agent 读取的技能文档，因而仍属于 R10 的“所有发货技能/平台提示”范围。是否由 `trellis update` 或限定生成同步再更新，应在主会话决定；本报告只记录源与生成预览的差异，不将其宣传为已完成。

另：`.pi` 等用户副本与 `.agents` 副本存在 python/python3 路径字面量差异（平台占位符替换），所以不能用整文件 hash 相等判断语义一致；应比较新增的三文件段落或通过实际生成结果核对。

### 当前结论

- 上节 Copilot、OpenCode、meta 三项 P1 的**模板源**和本次 69 条限定生成结果已定向修复，19/19 契约测试通过。
- **R10 仍不能最终宣称通过**，因为 Pi 用户技能副本仍有旧分流，且未出现在本轮限定同步清单中。
- JSON 故障子场景由核心实施者补测，本次未重复修改或宣称覆盖；全量回归与 5 个失败基线归因仍不在本报告通过范围内。

---

## 最终定向复审（2026-11-13 01:15，追加）

### 结论

**本轮平台审查范围内的原三项 P1 与上一轮新增的 Pi 副本 P1 均已闭环。** 我没有发现新的同范围阻断。该结论只覆盖 workflow/平台提示/分发源与本次 78 条限定生成结果，不等于核心实现、全量回归、正式旧新对照或 JSON 全部故障子场景已通过。

### 原 P1 的逐项复核

1. **Copilot check：闭环**
   - `packages/cli/src/templates/copilot/prompts/check.prompt.md` 已要求 `prd.md`、`design.md`、`implement.md` 三份文件，不再使用 `if present`。
   - 同文件已包含完整 reviewed planning version 边界、editorial、replan 和 legacy 例外。
   - 该文件已加入 `planning-contract.test.ts` 的 source 清单。

2. **OpenCode runtime prompt：闭环**
   - `packages/cli/src/templates/opencode/plugins/inject-subagent-context.js` 的 implement、check、finish 三个实际 runtime prompt 均已改为“新任务要求三份文件”，并明确只有已开工且无规划记录的 legacy 任务可用历史材料。
   - 三个 prompt 均写明实质变化交回主会话 `replan` 并重新确认，普通实现修复可继续。
   - 源文件与 `.opencode/plugins/inject-subagent-context.js` 已核对为同一内容。

3. **trellis-meta 参考源：闭环**
   - `references/platform-files/agents.md` 已去掉 optional / if present。
   - `references/customize-local/change-context-loading.md` 已改为 `design.md`、`implement.md` 必读。
   - `references/local-architecture/task-system.md` 已改为三份文件均为新任务要求，且包含 legacy 例外。
   - `references/local-architecture/context-injection.md` 已改为三文件读取顺序并加入版本/变更边界。

4. **Pi 用户技能副本：闭环**
   - 上一轮发现的 `.pi/skills/trellis-meta/` 旧副本已更新，四个相关文件均不再包含 `optional design.md`、`optional implement.md`、`design.md if present` 或 `implement.md if present`。
   - 四个 Pi 文件均出现在当前 `generated-a-files.json` 的 78 条清单中。
   - 抽查其内容与源语义一致：三文件必读、legacy 三键全缺失例外、replan 与重新确认、版本边界均存在。Pi 副本中的 `python`/`python3` 差异属于平台占位符替换，不作为语义差异。

### 生成与测试证据

- 当前 `generated-a-files.json`：78 条；清单内路径全部存在。
- 对清单内 78 条路径搜索旧 `optional design/implement` 与 `if present` 文案：无命中。
- 当前 `generated-recovered-sync.json`：记录 78 条恢复/限定同步结果；包含 Pi 的 12 个 A 相关文件，且 `privatePi` 明确只更新现有可发现文件。
- 独立复跑 `planning-contract.test.ts`：**19/19 通过**。
- 主会话报告的“先 5 失败 / 14 通过，修正后 19/19”与本次独立结果一致；未把该测试通过扩展解释为全量通过。

### 保留的未验证边界

- JSON 非对象、额外字段、缺失字段、超时等故障子场景由核心实施者补测；本轮没有重复修改实现，也不宣称这些子场景已全部验证。
- 全量回归、5 个既有失败的基线归因、build 的独立复跑以及正式旧新对照不在本轮通过结论内。
- 本次没有外部凭证操作；未出现凭证阻碍。

**最终平台审查判定：在本轮授权的平台/工作流/分发范围内，原 P1 已闭环，78 条限定生成结果与源一致，19/19 契约测试通过；没有剩余的平台侧阻断。**
