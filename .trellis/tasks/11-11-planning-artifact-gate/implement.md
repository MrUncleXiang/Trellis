# A：实施计划

> 执行者：未来获准实施后，按批次使用 `superpowers:executing-plans`（逐步执行计划技能），或用户明确选择的子代理方式执行；本文件不授权派发实施。本轮只形成规划。未来实施时以本文件为已审指令，不在原文勾选或追加结果；在 `research/implementation-progress.md` 按批次/步骤编号记录进度和证据，避免正常进度造成规划版本漂移。

**目标：** 让首次开工、版本确认、文字勘误和实施中回规划遵循同一检查契约。

**架构：** 新增单一 `common/planning.py`；复用现有任务状态和 `meta`，在 `start` 的任何开工副作用之前检查材料和版本；平台通过只读状态命令读取同一检查结果。

**技术：** Python 3.9 标准库、TypeScript（类型化脚本语言）的既有模板分发、Vitest（项目测试框架）、Git（版本管理工具）隔离样例。

契约以 [prd.md](prd.md)、[design.md](design.md) 为准；本任务新命令尚未存在时，开工按设计D9及[自举记录](research/bootstrap-review-2026-11-12.md)使用人工版本清单和既有start命令，不能先实施再补批准；测试编号和每种输入/输出见[测试计划](research/test-plan-2026-11-12.md)。任务状态仍 `planning`。代码块是未来修改的具体落点与关键逻辑，不在本轮写入产品文件；未列出的旧逻辑需保留，不借规划重构整个任务系统。

## 执行前边界

- 当前 HEAD 为 `9b76fe49f19de4d383dd4677fea803e2f2da7004`，分支 `codex/research-evidence-handoff`；存在42项其他任务修改，保护清单见 [planning-write-before-2026-11-12.json](research/planning-write-before-2026-11-12.json)。不得一键重置、整文件覆盖或提交它们。
- 实施前从固定旧基线准备独立工作区，只带 A 的规划及之后 A 的改动。若采用已获准的其他隔离方式，同样保存范围清单。市场工作流在 marketplace 子模块内，提交和推送时先保证子模块提交可从其远程获取，再更新主仓库引用；不改已确认的个人派生仓库地址。
- 改任何函数前按 AGENTS.md 运行 GitNexus 的 `impact`（上游影响分析），汇报调用者、流程、风险；索引过期或扩展失败不能解释成无影响。提交前运行 `detect_changes`（变更范围检测）。本轮没有产品符号修改，不伪报已完成这些实施检查。
- 共享文件已有其他修改时，在隔离区按片段合并；保留 B 已接受的调研保存和交接规则。每批先加失败测试，确认失败原因，再最小实现、定向验证；先检查失败是否来自该批，不把未知失败吞掉。

## 文件职责与修改范围

源模板前缀：`packages/cli/src/templates/trellis/scripts/`；对应本仓库副本前缀：`.trellis/scripts/`。下表中的脚本改动都同时维护这两份，内容逐字节一致。

| 文件 | 修改职责 |
| --- | --- |
| 新增 `common/planning.py`（两树） | 三文件读取和指纹、记录形状、勘误链、共同检查、声明和回规划命令 |
| `task.py`（两树） | 注册 attest/replan/planning-status、start参数、无副作用前置检查、保存结果处理 |
| `common/task_context.py`（两树） | validate接入共同检查，不改原上下文清单语义 |
| `common/task_store.py`（两树） | archive仅规划警告、创建文案三文件统一 |
| `packages/cli/src/templates/trellis/index.ts` | 分发新增模块 |
| 新增 `packages/cli/test/scripts/task-planning.integration.test.ts` | T01—T28及T38真实命令/并发边界观察 |
| 新增 `packages/cli/test/scripts/planning-status.integration.test.ts` | T29—T33状态/平台提示链路测试 |
| 新增 `packages/cli/test/templates/planning-contract.test.ts` | T34—T37发货生成、规则一致性测试 |
| `packages/cli/test/regression.test.ts` | 明确改坏记录旧容错预期；首次开工样例加真实测试版声明/确认；恢复类保留恢复断言 |
| `packages/cli/test/templates/trellis.test.ts` | 新模块分发注册断言；若已有全映射断言则扩展其源清单 |
| 新增任务内 `research/compare-planning-versions.py` | P01—P16固定提交同条件对照，不发货 |

提示与工作流来源文件在批次5完整列出，不将生成副本当真相源。

## 批次0：本任务的自举开工（产品修改前）

**B0.1** 独立审查修正后，为三份当前材料保存完整内容快照和人工版本清单；版本清单不放进三份被哈希材料，避免循环；记录完整指纹与唯一人工版本标签。快照复读须与清单吻合。

**B0.2** 在对话展示该版本的目标、范围、方案、验收、风险及审查修正，等待用户明确同意按该版本实施。把真实答复与可回查位置追加到审阅记录，不将“你推进”倒写为已批准尚未展示的修正版。

**B0.3** 开工前核对三份当前指纹与获批清单；仅文字勘误明确列出差异，实质变化则重新展示确认。选择独立实施工作区并执行项目要求的影响分析。未经B0.2或材料有未获准实质变化，不执行任何后续批次。

**B0.4** 运行当前已存在的 `python .trellis/scripts/task.py start .trellis/tasks/11-11-planning-artifact-gate`（在隔离区使用对应任务路径），保存退出码和状态回读。此时不传尚未支持的新参数；无身份降级不捏造会话指针。

**B0.5** 在 `research/implementation-progress.md` 记录B0.1—B0.4真实凭据。只有确认有效、版本复核一致、开工命令成功且状态回读为in_progress，才进入B1.1。若命令失败，按真实错误处理，不能把已写产品代码当作批准证据。

## 批次1：固定版本、文件和记录检查

**文件：** 新模块两份；`task-planning.integration.test.ts`；分发 `index.ts`。

**B1.1** 在临时仓库复制 `getAllScripts()` 的真实脚本，创建有原有清单的规划任务；新增T01—T09、T14、T18的输入和断言。参数化每一份材料，故意保持清单有效，避免把清单失败误认成规划门禁有效。

**B1.2** 运行定向测试，当前版应因无 `attest` 或尚无检查而失败；保存失败日志，不以“命令不存在”的测试结果当实现已正确。

**B1.3** 实现 D1 文件函数、D2 记录结构检查和 D4 `PlanningCheck`；新planning.py首部写 `from __future__ import annotations`，所有联合类型注解所在旧模块保留该声明。分开实现 `record_errors`（只读记录/链）与 `check_current_files`（只读三文件/指纹），普通共同检查组合两者，勘误仅对文件差异采用D4明确路径。非空检查使用 `text.strip()`，哈希使用原字节 `replace(b"\r\n", b"\n")` 后SHA-256。记录版本类型要求严格整数1（不能把Python的True当1），字段按设计逐项检查，错误信息包含键路径。勘误链用下述连续性检查，不只比较最后一个哈希：

```python
def chain_errors(attest: dict) -> list[str]:
    current = attest["reviewFiles"]
    errors: list[str] = []
    for index, change in enumerate(attest["editorialChanges"]):
        if change["before"] != current:
            errors.append(f"planningAttest.editorialChanges[{index}]: broken chain")
        current = change["after"]
    if current != attest["files"]:
        errors.append("planningAttest.files: does not match editorial chain")
    return errors
```

先通过完整形状检查再调用，不能让缺键产生 traceback。`planningReplan` 存在时也检查D2字段：仅planning允许，原因/影响/独立范围均为非空文本，时间格式有效；新版实施态还残留该键则判invalid，不悄悄忽略。`check_planning` 对规划/新版实施态/旧实施态按 D5 表分支；旧实施兼容必须检查三个新键均不存在，而不是值为空。

**B1.4** 增加模板分发来源，确保初始化/更新实际携带新模块：

```typescript
export const commonPlanning = readTemplate("scripts/common/planning.py");
// 在 getAllScripts() 的 common 部分：
scripts.set("common/planning.py", commonPlanning);
```

**B1.5** 定向运行T01—T09的模块检查和分发断言；两树比较成功。命令尚未接完时只报告本批检查结果，不称整条门禁通过。

## 批次2：声明和勘误命令

**文件：** 两树 `common/planning.py`、`task.py`；`task-planning.integration.test.ts`。

**B2.1** 补T05、T14—T19；运行并确认当前缺命令/行为失败。

**B2.2** 在入口注册以下参数并导入对应处理器，不增加任何规划绕过参数：

```python
p_attest = subparsers.add_parser("attest", help="Record reviewed planning files")
p_attest.add_argument("dir")
p_attest.add_argument("--note", required=True)
p_attest.add_argument("--editorial", action="store_true")
# 在 main() 现有 commands 字典中增加：
# "attest": cmd_attest,
```

普通声明构造以下完整对象，所有输入校验先于写入：

```python
record = {
    "schemaVersion": 1,
    "reviewId": uuid.uuid4().hex,
    "attestedAt": datetime.now(timezone.utc).isoformat(),
    "note": args.note.strip(),
    "reviewFiles": dict(files),
    "files": dict(files),
    "editorialChanges": [],
}
meta["planningAttest"] = record
meta.pop("planningApproval", None)
```

其中 `files` 来自共同指纹函数，`meta` 是有效任务原对象中的字典；保留未知键及 `planningReplan`。普通声明仅规划态允许。用已有 `write_json` 保存并检查布尔结果；写失败返回1，不输出成功版本。

**B2.3** 勘误路径严格要求已有有效确认、记录链和允许状态；当前文件允许漂移，坏链不允许。具体追加逻辑：

```python
if files == attest["files"]:
    print("No planning content changes; record left unchanged.")
    return 0
attest["editorialChanges"].append({
    "recordedAt": datetime.now(timezone.utc).isoformat(),
    "note": args.note.strip(),
    "before": dict(attest["files"]),
    "after": dict(files),
})
attest["files"] = dict(files)
```

追加后在拟保存对象上重新检查record_errors与check_current_files均通过，不能先执行要求旧文件匹配的普通check_planning而把勘误拒绝。保持初始待审时间、说明、版本和原确认，输出“勘误是执行者声明，未自动验证语义”。在完成所有校验和内存构造之后才保存。

**B2.4** 运行T05、T14—T19及两树一致检查，核对普通重新声明无论文件是否相同都会生成新id；未确认状态不能借勘误沿用批准。

## 批次3：实际开工、校验及失败顺序

**文件：** 两树 `task.py`、`common/task_context.py`；`task-planning.integration.test.ts`；既有 `regression.test.ts`。

**B3.1** 加T10—T13、T23—T27；预置钩子写唯一哨兵文件、预先设置另一个任务的会话定位，断言失败时两者不动。首次开工、正常恢复和无身份降级分开建样例。

**B3.2** start注册参数：

```python
p_start.add_argument("--review", help="Exact reviewed planning version")
p_start.add_argument("--approval-note", help="User reply approving this version")
p_start.add_argument("--approval-source", help="Retrievable source of that reply")
p_start.add_argument("--editorial-note", help="Meaning-preserving corrections since the reviewed version")
```

`cmd_start` 入口在上下文检查之前先严格读任务与状态，再共同检查，严格按D4判定表允许planning+waiting_confirmation由本次三个确认参数转为开工，不能只接受ready；规划态要求三参数非空且id匹配。实施态恢复拒绝传这组三参数及 `--editorial-note`。规划态显式勘误按 D3 在内存准备连续链，允许原指纹到当前指纹的已声明文字修订；原声明结构、用户确认版本及三个确认参数仍须全部有效；共同检查如果只报当前文件差异，可在此显式路径准备内存勘误，其他结构错误一律拒绝。无差异或空勘误说明返回1。保留 `--allow-empty-context` 的既有范围，规划检查永远先执行，不放进该开关分支。明确删除坏task.json仍设置指针的成功路径。

**B3.3** 将 `_record_start_state` 调整为接收已经复核的任务数据及可选批准，精确签名为 `_record_start_state(task_json_path: Path, repo_root: Path, data: dict, approval: dict | None = None, label: str = "") -> bool`；同一次保存分支/确认/状态；首次勘误还包括新链。先在内存把批准、勘误、in_progress及清除replan全部构成完整候选，再对候选执行两层检查，不能要求磁盘上已存在本次批准。确认对象为：

```python
approval = {
    "schemaVersion": 1,
    "reviewId": args.review,
    "reviewedFiles": dict(attest["reviewFiles"]),
    "recordedAt": datetime.now(timezone.utc).isoformat(),
    "note": args.approval_note.strip(),
    "source": args.approval_source.strip(),
}
```

写之前重新读取task.json和三份文件，与前置读取的状态/记录/指纹比较；如果是显式首次勘误，则分别比较原声明与准备后当前指纹，不能把勘误后的数据与旧指纹直接比较导致永远失败。未被此次显式勘误覆盖的漂移则1且不写。不用先设置会话定位再发现状态保存失败的旧顺序。状态保存失败则立即1；成功后有身份才调用现有 `set_active_task`；定位失败报告已登记开工但未定位并返回1；无身份走同一保存成功结果、只跳过定位。仅整条路径成功才运行 `after_start`。保留显式分支不覆盖、空分支填充和base_branch冲突提示。

**B3.4** `cmd_validate` 复用 `check_planning`，逐项输出；`waiting_confirmation` 单独提示但不算错误，其他非法材料计错误。已完成/归档任务规划项仅警告，原清单检查保留。不能新增第二套哈希和状态判断。

**B3.5** 更新旧回归样例：坏记录明确返回1且无指针；planning→in_progress成功样例先attest再传对应确认，身份降级同样处理；幂等恢复不传审批参数。不把本来测试清单拒绝的样例变成先因缺材料拒绝，必须补齐其规划前置条件。

**B3.6** 运行T10—T13、T23—T27以及旧regression集；将旧已知失败与新失败单列，未归因不可继续宣称通过。

## 批次4：实施中回规划和归档提醒

**文件：** 两树 `common/planning.py`、`task.py`、`common/task_store.py`；`task-planning.integration.test.ts`。

**B4.1** 加T20—T22、T26、T28；覆盖旧实施任务、有新记录任务和review状态。

**B4.2** 先暂停受影响工作，并按D8把旧轮版本、展示摘要及真实批准出处保存到审阅日志；若保存失败先处理，不把回规划命令当作历史已保全。随后注册 `replan` 并按 D3 参数校验：

```python
p_replan = subparsers.add_parser("replan", help="Pause affected work and return to planning")
p_replan.add_argument("dir")
p_replan.add_argument("--reason", required=True)
p_replan.add_argument("--affected", required=True)
p_replan.add_argument("--independent", default="none")
# 在 main() 现有 commands 字典中增加：
# "replan": cmd_replan,
```

有效实施态任务一次保存下述变化，保留所有其余字段：

```python
data["status"] = "planning"
meta["planningReplan"] = {
    "requestedAt": datetime.now(timezone.utc).isoformat(),
    "reason": args.reason.strip(),
    "affectedWork": args.affected.strip(),
    "independentWork": args.independent.strip(),
}
meta.pop("planningAttest", None)
meta.pop("planningApproval", None)
```

不清会话、不改分支、不动实现文件；`start` 成功时清除本项。同一planning任务重复执行拒绝，不重置原因。

**B4.3** 在 `cmd_archive` 的有效任务信息已读取、原归档检查仍保留的位置，调用共同检查并将问题转为 stderr 警告；历史任务缺材料逐项点名但不新增失败条件。创建需求初稿和控制台两条旧轻重提示统一改为三文件要求，不生成空文件。

**B4.4** 运行T20—T22、T26、T28和既有归档测试。用真实临时目录断言归档已移动并原警告可见，不能只搜提示文字。

## 批次5：工作流和提示链路

**修改来源（完整路径）：**

```text
packages/cli/src/templates/trellis/workflow.md
packages/cli/src/templates/common/skills/brainstorm.md
packages/cli/src/templates/common/skills/before-dev.md
packages/cli/src/templates/common/skills/check.md
packages/cli/src/templates/common/commands/continue.md
packages/cli/src/templates/common/commands/start.md
packages/cli/src/templates/shared-hooks/session-start.py
packages/cli/src/templates/shared-hooks/inject-subagent-context.py
packages/cli/src/templates/codex/hooks/session-start.py
packages/cli/src/templates/copilot/hooks/session-start.py
packages/cli/src/templates/copilot/prompts/brainstorm.prompt.md
packages/cli/src/templates/copilot/prompts/start.prompt.md
packages/cli/src/templates/opencode/lib/session-utils.js
packages/cli/src/templates/common/bundled-skills/trellis-meta/references/local-architecture/task-system.md
packages/cli/src/templates/common/bundled-skills/trellis-meta/references/customize-local/change-workflow.md
packages/cli/src/configurators/shared.ts
.trellis/spec/cli/backend/platform-integration.md
.trellis/spec/cli/backend/workflow-state-contract.md
marketplace/workflows/native/workflow.md
marketplace/workflows/tdd/workflow.md
marketplace/workflows/channel-driven-subagent-dispatch/workflow.md
```

另修改两树 `task.py` 和 `common/planning.py` 增加只读查询；平台副本通过生成同步。原19来源包括批次4的task_store；本批新增before-dev/check是为了真正覆盖实施中变化，不以原计数限制必要接入。

**B5.1** 加T29—T33真实状态与提示测试、T34—T37生成规则测试，确认旧提示仍说PRD-only和没有真实版本的失败。

**B5.2** `planning_summary` 从共同检查构造固定结构，`planning-status` 仅输出JSON：

```python
summary = {
    "mode": check.mode,
    "reviewId": check.review_id,
    "note": check.note,
    "approvalNote": check.approval_note,
    "approvalSource": check.approval_source,
    "changedFiles": check.changed_files,
    "errors": check.errors,
    "replan": meta.get("planningReplan"),
}
print(json.dumps(summary, ensure_ascii=False))
```

其中 `meta` 已通过严格对象检查；坏类型任务查询返回1，不在输出阶段再触发异常。入口固定要求 `--json`，不存在任意命令执行参数；坏任务读取1，不合格规划诊断0。按现有 `commands` 字典加入 `"planning-status": cmd_planning_status`，不要仅设置未被现有分发读取的 `func`。入口处理器 `cmd_planning_status(args: argparse.Namespace) -> int` 在 `task.py` 定义，读取并严格检查任务后调用 `planning_summary`；复用已有路径解析、Windows编码和输出方式。

**B5.3** 三种Python启动提示和OpenCode调用真实入口，5秒超时，不实现各自哈希器；严格验证JSON输出结构。成功展示版本、说明和状态，失败展示“版本检查不可用，请运行validate”。对文字转义，沿用已有Python命令选择；测试注入查询失败时仅替换外部子进程，不模拟内部检查模块。无活动/完成任务不查询。T33仅验证JSON字符串编码及`&`/`<`/`>`转义和容器边界；模型是否误服从数据中的指令另做M6，不声称字符串测试能证明模型安全。

**B5.4** 将工作流1.1/1.2统一三份；1.3保留上下文整理；1.4明确“内容核对→attest→validate→展示版本→用户确认→带版本start”，并按D8在任务的 `research/planning-review-log.md` 追加摘要、版本指纹、变化及真实答复出处。2.1/2.2写入“实质变化暂停受影响工作→replan→更新材料→1.4→恢复”；对话变化也适用，普通实现修错不触发。各技能、三市场工作流和Copilot提示同义一致；`build_implement_prompt` 与 `build_check_prompt` 明确新任务材料齐备和变更交主会话复核，保留原自修实现错误能力，不抹去B的调研保存时机、未决问题检查和交接规则。明确修改brainstorm的PRD Convergence Pass：仍做无损收敛、保留决定/证据并解决冲突，但不强制固定章节和扩写；极短三文件按内容用途接受，提示也不能另设章节门槛。

**B5.5** 修改 `buildPullBasedPrelude` 来源文字并测试实际平台生成结果，保留其余占位替换行为；三份材料统规则不再出现“如果存在才读设计/计划”的首次开工指引，历史兼容恢复的条件要显式写清。

**B5.6** 按测试T36用旧[关键词清单](research/current-behavior-evidence/current-mention-counts.json)逐文件复核，再人工读上下文。该计数只辅助，不能证明流程一致。生成副本不手改；用既有 `collectPlatformTemplates`/`configurePlatform` 测试在临时根生成21个平台产物，并按现有文件所有权规则只更新本任务来源的本地副本。不得在脏根目录使用 `update --force` 覆盖所有文件。

**B5.7** 运行T29—T37及平台/模板旧回归，检查新增模块已被dist拷贝且提示调用路径在临时安装目录可用。

## 批次6：可执行测试骨架和完整场景落地

**文件：** 三份新增测试与旧测试中明确受影响的样例。测试使用真实脚本，不写只检查源码存在某字符串的替代门禁测试。

**B6.1** 下列为T06的可运行测试骨架；参数化扩展按测试矩阵逐条固定输入与断言，不能用一个失败命令冒充全部分支覆盖。环境名单中只复制操作系统和工具必需项，不继承宿主会话/项目定位变量。当前工作区的 `test/helpers/python.ts` 属于其他未提交改动、固定旧基线没有它；A测试在自身文件内选取Python命令，不能借用该文件形成隐藏依赖：

```typescript
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getAllScripts } from "../../src/templates/trellis/index.js";
const PYTHON = process.platform === "win32" ? "python" : "python3";

describe("planning gate", () => {
  it("rejects missing attestation before any start side effect", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-planning-"));
    try {
      const env: NodeJS.ProcessEnv = {};
      for (const key of ["PATH", "Path", "SYSTEMROOT", "SystemRoot", "WINDIR", "TEMP", "TMP", "PATHEXT", "COMSPEC"]) {
        if (process.env[key] !== undefined) env[key] = process.env[key];
      }
      env.TRELLIS_CONTEXT_ID = "planning-test";
      env.PYTHONIOENCODING = "utf-8";
      const git = spawnSync("git", ["init", "-q"], { cwd: root, env, encoding: "utf-8" });
      expect(git.status).toBe(0);
      for (const [name, text] of getAllScripts()) {
        const target = path.join(root, ".trellis/scripts", name);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, text);
      }
      const dir = path.join(root, ".trellis/tasks/case");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(root, ".trellis/config.yaml"), "session_auto_commit: false\n");
      const record = JSON.stringify({ id: "case", name: "case", title: "Case", description: "Local prompt", status: "planning", branch: null, base_branch: null, meta: {} });
      fs.writeFileSync(path.join(dir, "task.json"), record);
      fs.writeFileSync(path.join(dir, "prd.md"), "Change one local prompt.\n");
      fs.writeFileSync(path.join(dir, "design.md"), "Edit the source template so generated copies agree.\n");
      fs.writeFileSync(path.join(dir, "implement.md"), "Edit source; render and compare the output.\n");
      fs.mkdirSync(path.join(root, ".trellis/spec"), { recursive: true });
      fs.writeFileSync(path.join(root, ".trellis/spec/test.md"), "Preserve unrelated text.\n");
      for (const name of ["implement.jsonl", "check.jsonl"]) {
        fs.writeFileSync(path.join(dir, name), JSON.stringify({ file: ".trellis/spec/test.md", reason: "Fixture contract" }) + "\n");
      }
      const result = spawnSync(PYTHON, [".trellis/scripts/task.py", "start", ".trellis/tasks/case", "--allow-empty-context"], { cwd: root, env, encoding: "utf-8" });
      expect(result.error).toBeUndefined();
      expect(result.status).toBe(1);
      expect(result.stdout + result.stderr).toMatch(/attest/i);
      expect(fs.readFileSync(path.join(dir, "task.json"), "utf-8")).toBe(record);
      expect(fs.existsSync(path.join(root, ".trellis/.runtime/sessions"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
```

**B6.2** T03读取故障、T13原子替换计数、T27写故障和T31查询故障才用外部I/O边界的测试包装器，断言具体失败顺序；普通测试不模拟 `check_planning`。包装器通过runpy运行真实task.py，只在精确样例路径的Path.read_bytes/os.replace等I/O边界抛出OSError或统计替换次数，不改产品模块逻辑/返回值；包装脚本及故障日志只位于临时测试目录，不增加产品故障开关。T13目标task.json的成功os.replace恰好一次，替换前内容为旧状态，替换目标的新内容同时包含批准和in_progress；指针文件替换另计。所有声明、勘误、回规划、开工写入用例预置未知顶层键和meta.other哨兵，成功后保留，失败后原字节不变。对同一固定时间/随机id只做形状和一致性断言，不锁定真实时钟或固定uuid来掩盖版本更新。

**B6.3** 跑完T01—T38并执行M1—M6，存实际输入、输出和结论。T38只记录本版不支持的同任务并发观察，不能作为并发保护通过；受支持流程由主会话串行写状态。M5/M6是能力反例，成功标准是诚实报告机器无法判断的部分，不是机器必须识破语义矛盾。

## 批次7：固定提交旧新对照与最终验证

**文件：** 任务内 `research/compare-planning-versions.py`、`research/version-comparison/`、`research/implementation-verification.md`。

**B7.1** 使用同一数据生成函数实现P01—P16，参数和输出目录严格按测试计划；导出两个固定提交，不在执行过程中改源仓库、不覆盖旧10场景证据。

**B7.2** 按下列顺序运行，逐项记录退出码、实际用例数和失败归属：

```powershell
pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/task-planning.integration.test.ts
pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/planning-status.integration.test.ts test/templates/planning-contract.test.ts
pnpm --filter @mindfoldhq/trellis exec vitest run test/regression.test.ts test/templates/trellis.test.ts test/scripts/task-archive.integration.test.ts
pnpm build
pnpm lint
pnpm typecheck
pnpm --filter @mindfoldhq/trellis lint:py
pnpm test
```

**B7.3** Python3.9环境除语法检查外，真实导入common.planning并运行attest→validate→带版本start最小样例；记录解释器路径/版本和结果。本机无3.9时使用既有持续集成的3.9环境验收，未实际运行前不得声称支持已验证。随后分离提交A代码并固定新版SHA，再执行同条件对照命令；提交只包含已获准且核查过的A文件。若提交钩子自动改格式，重新核查差异并重跑受影响检查，不能把固定提交之外的修复计入结果。对照报告作为后续证据提交，不修改已测代码SHA。

**B7.4** 最终审阅R1—R11覆盖表、B保留内容、两脚本树、子模块和生成器。报告共同旧失败/新增回归/未执行项；全量没有通过就不说“全通过”。提交前按AGENTS做变更范围检测，不关闭或归档其他任务。

## 最终交付与停止条件

本轮的交付是三份规划、测试矩阵及上下文清单；实施步骤均未执行。未来实施前先审阅这套版本，取得针对该版本的明确开工答复。若实施遇到实质范围或方案变化，按R5暂停受影响工作、回规划更新并重新确认，不能为了赶完本计划自行扩大授权。

全部代码和测试完成、证据可回查后，才进入独立质量审查及最终验收。归档、提交来源治理C仍是独立任务，本计划不宣称自动完成。

执行进度记录 `research/implementation-progress.md` 只写实际完成步骤和证据，不提前制造空报告；任何实质变化仍更新规划并重新确认，不能用进度记录偷改步骤。

上下文清单的长规范通过[定向读取索引](research/context-read-map-2026-11-12.md)接入，避免注入上限截断。实施者仍须按修改区域读取原规范；当前三份主材料由既有上下文流水线自动补入，不在JSONL重复占用预算。

## 规划自审覆盖表

| 需求 | 设计落点 | 实施批次 | 验证落点 |
| --- | --- | --- | --- |
| R1 | D1、D5、D6 | 1、4、5 | T01—T04、T22、T35；M1/M5 |
| R2 | D1—D3 | 1、2 | T05—T09、T14 |
| R3 | D2—D4、D8 | 2、3、5 | T10—T14、T17—T18；M2/M6 |
| R4 | D2、D3、D8 | 2、3 | T07—T08、T12、T14—T19；M2/M3/M6 |
| R5 | D3、D5、D6、D8 | 4、5 | T19—T22、T26、T37；M4 |
| R6 | D1、D4 | 3、6 | T01、T06、T11—T13、T24—T25、T27、T38 |
| R7 | D4、D6 | 3、5 | T07、T10、T18、T29 |
| R8 | D4、D5 | 3、4 | T21—T24、T26、T28、T32 |
| R9 | D1、D2、D4、D6 | 1—4、7 | T03、T05、T09、T16、T20、T24、T27、T34 |
| R10 | D6、D8 | 5 | T29—T37 |
| R11 | D7及测试计划 | 6、7 | T01—T38、P01—P16、M1—M6 |

D9自举由B0.1—B0.5及测试计划的S0执行凭据覆盖。以上为规划覆盖核对，不是实施验收通过记录。自审修正包括：首次开工前的文字勘误路径、实际commands字典分发、新模块显式分发、自动注入检查提示的授权边界、大规范截断及未提交测试帮助文件的隐式依赖。所有批次仍未执行；本版不提供同任务并发写入隔离，运行约束与T38观察须在最终审阅说明。
