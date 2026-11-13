# 核心需求独立审查报告

- 审查日期：2026-11-12
- 审查角色：独立需求审查者（只读）
- 审查工作区：`C:/Users/PXWD/.codex/worktrees/planning-artifact-gate/Trellis`
- 审查基线：`9b76fe49f19de4d383dd4677fea803e2f2da7004`
- 审查范围：R1—R11、D1—D5；核心脚本与核心命令测试。平台模板、生成器和渲染边界由另一审查者负责，本报告不重复判定。

## 结论

**阻断。当前实现不满足已批准的 R1—R11/D1—D5 全部门禁契约，不能作为 A 完成或提交验收依据。**

已确认的问题：

1. `planning`（规划中）半成品记录可被 `validate` 错误放行。
2. 普通 `attest` 和 `replan` 可以覆盖或清除损坏的规划记录，而不是按 D5 拒绝。
3. 存在 `planningReplan: null` 时不会被当作“键存在但结构错误”，实施态仍可恢复；完成态残留 `planningReplan` 也不报错。
4. `replan` 强制要求 `--independent`，与设计中“默认 none”不一致。该问题不是主阻断，但会造成约定漂移。
5. 核心测试存在覆盖缺口；另有一条旧权限测试会被新的规划门禁提前拦截，实际没有验证它声称要验证的会话指针写入失败。

核心 27 项和状态 23 项测试通过是事实，但不足以推翻上述反例。

## 独立执行的证据

### 通过的检查

在隔离工作区直接执行：

```text
pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/task-planning.integration.test.ts
```

结果：`27 passed`。

```text
pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/planning-status.integration.test.ts
```

结果：`23 passed`。

实际 Python 3.9.13 最小链路：

```text
attest -> validate -> start -> planning-status
```

四次退出码均为 `0`，最终状态为 `in_progress`，证据保存于 `research/python39-smoke-current.json`。

两套脚本目录的相关文件哈希一致：

- `common/planning.py`：两树均为 `CE0E60E7819B36696049D8FDB916CE12709EAD8C040B0BBDFC0298D041E9467F`
- `task.py`：两树均为 `616A9FE7531A7A42E9C093FC6B8E446D8D37C55FF2D6728461433FFF4CD44787`
- `common/task_context.py`：两树均为 `3E74DA6B447266DF38D3D73FAC8FA4FF5733F2A1EA0094705D50C2E46DF7C102`
- `common/task_store.py`：两树均为 `D84D0C6AF7C51AB05271C704E2D8CE848E994536D6DB15632D0EFE1B822120C2`

### 反例一：`validate` 放行 `planning + planningApproval`

**严重性：P1（阻断）。**

契约位置：

- `design.md` D4 的确定性判定：`planning + ready` 表示“已有确认但仍 planning，不是正常原子开工产生的状态”，应返回 1。
- R7：`validate` 与 `start` 复用同一结构和版本检查；不能把校验成功说成可开工。

实现位置：

- `packages/cli/src/templates/trellis/scripts/common/planning.py:378-389`：存在 `planningApproval` 时返回 `mode="ready"`，同时把“approval exists while planning”放进 `errors`。
- `packages/cli/src/templates/trellis/scripts/common/task_context.py:199-203`：把所有 `mode == "ready"` 都当成成功分支，只打印模式，不打印或累计 `check.errors`。

真实命令复现：

1. 用正常三文件执行 `attest`。
2. 用对应 `reviewId` 执行带用户确认的 `start`。
3. 把 `task.json.status` 手工改回 `planning`，保留已经自洽的声明和确认。
4. 执行 `validate`。

实际结果：`validate` 退出码为 `0`，输出“All validations passed”。这不是“待审可送审”状态，而是 D4 明确要求拒绝的半成品状态。

影响：工作流可能把应修复的记录误认为通过，随后继续展示或尝试开工；虽然 `start` 仍会拒绝，`validate` 自身已经违反 R7。

### 反例二：损坏记录可被 `attest` 或 `replan` 覆盖清除

**严重性：P1（阻断）。**

契约位置：

- D5 失败矩阵：缺失、损坏、未知状态或坏 `meta`，应拒绝 `start`、`声明`、`回规划` 并点名修复，不能按历史任务处理。
- 测试计划 T09：未知版本、错误形状应返回 1、不覆盖。
- D2：未知模式版本不能被静默重写。

实现位置：

- `packages/cli/src/templates/trellis/scripts/common/planning.py:235-250`：`record_errors` 只在记录值不是 `None` 时验证对应记录。
- `packages/cli/src/templates/trellis/scripts/task.py:629-648`：普通 `attest` 只检查是否存在 `planningApproval`，随后直接构造新 `planningAttest`，没有先验证旧的声明。
- `packages/cli/src/templates/trellis/scripts/task.py:683-699`：`replan` 直接移除 `planningAttest` 和 `planningApproval`，再构造新候选；没有先对当前坏记录调用 `record_errors`。

真实命令复现 A（普通声明）：

1. 建立 `planning` 任务。
2. 写入 `meta.planningAttest = {"schemaVersion": 2}`。
3. 执行 `task.py attest <dir> --note "new review"`。

实际结果：退出码 `0`，旧 `schemaVersion: 2` 被静默替换成新的 `schemaVersion: 1`。这正好是 T09 声称要防止的“未知版本被覆盖”。

真实命令复现 B（回规划）：

1. 建立 `status="in_progress"` 任务。
2. 写入同样的损坏 `meta.planningAttest = {"schemaVersion": 2}`。
3. 执行带完整参数的 `task.py replan`。

实际结果：退出码 `0`，损坏声明被删除，任务被改成 `planning`，只保留新的 `planningReplan`。

影响：任何损坏的规划记录都可以被普通声明或回规划“洗白”，导致门禁证据丢失，违反 R6/R8/D5。这是当前最直接的阻断项。

### 反例三：`planningReplan: null` 没有按键存在处理

**严重性：P1/P2（阻断候选）。**

契约位置：

- D2：`planningReplan` 若存在也必须符合对象形状，并且只允许在 `planning`；实施态残留它是无效记录，不能按 ready 恢复。
- D5：键为 `null`、坏类型或半套新记录不能当作旧任务。

实现位置：

- `packages/cli/src/templates/trellis/scripts/common/planning.py:241-250`：`replan = meta.get("planningReplan")` 后使用 `if replan is not None`，因此键存在但值为 `null` 时被当成“没有该键”。
- `packages/cli/src/templates/trellis/scripts/common/planning.py:362-371`：状态残留检查同样使用 `replan is not None`。
- `task.py` 的恢复路径继续把这种记录当作可用记录。

真实命令复现：

1. 完成正常的 `attest` 和带确认 `start`，得到有效 `in_progress` 记录。
2. 在合法记录之外加入 `meta.planningReplan = null`。
3. 执行不带确认参数的 `task.py start <dir>`。

实际结果：退出码 `0`，任务被当作正常恢复，`planningReplan` 仍保留为 `null`。

影响：D2 明确要求“键存在即检查形状”，实现却把 `null` 当作缺失。T23 只覆盖了三个键分别单独为 `null` 时的缺少声明组合，没有覆盖“合法声明/确认旁边多出一个 null 回规划键”。

### 反例四：完成态残留 `planningReplan` 未被识别

**严重性：P2。**

实现位置：

- `packages/cli/src/templates/trellis/scripts/common/planning.py:351-362`：先处理 `status == "completed"`，之后才检查 `planningReplan` 是否只允许在 `planning`。

真实命令复现：

1. 建立有效三文件任务。
2. 设置 `status="completed"`，并放入形状正确的 `planningReplan` 对象。
3. 执行 `validate` 和 `planning-status --json`。

实际结果：`validate` 退出码 `0`；`planning-status` 返回 `mode: "completed"`、`errors: []`，但仍返回 `replan` 对象。D2 的“只允许在 planning”没有被执行。

这比 `null` 问题范围窄，但仍是记录契约不一致。完成态可以不要求补档，但也必须把残留回规划记录作为规划警告或无效记录报告，而不是完全静默。

### 反例五：`replan` 的 `--independent` 与设计默认值不一致

**严重性：P3。**

契约位置：

- D2 的 `PlanningReplan.independentWork` 注释：默认 `none`。
- `design.md` D3 要求非空的原因和影响范围；示例中的 `--independent` 是辅助说明。
- `task.py:983` 的帮助文本也写着 `default: none`。

实现位置：

- `packages/cli/src/templates/trellis/scripts/task.py:672-681`：省略 `--independent` 时得到空字符串，并被当作错误拒绝。

实际复现：

```text
task.py replan <dir> --reason change --affected all
```

实际退出码为 `1`，只接受显式传入 `--independent none`。这会使设计说明与实际命令行为不一致；如果设计确实要求用户必填，应修改契约和帮助文本，不能保留“默认 none”。

## 测试覆盖与遮蔽

### 已覆盖且通过的部分

- 三文件缺失、空白、目录、不可读和 CRLF/LF 指纹规则。
- 声明、确认、勘误链的基本结构和严格整数 `schemaVersion`。
- 正常等待确认、带对应版本开工、确认绑定原始 `reviewFiles`。
- 无会话身份时门禁先执行，成功状态写入但不写指针。
- 基本 `replan` 成功、漂移拒绝、旧实施任务恢复例外。
- `validate` 的缺失文件、正常等待确认和基本完成态警告。
- `archive` 的原有阻止条件保留，规划问题按警告追加。
- Python 3.9 的标准库导入和最小四步链路。

### 未被现有测试覆盖的分支

- `planning + planningApproval` 的 `validate` 结果；现有 27 项没有该断言。
- 坏 `planningAttest` 后执行普通 `attest` 是否应拒绝且不覆盖。
- 坏规划记录的执行态 `replan` 是否应拒绝。
- 合法声明/确认旁边存在 `planningReplan: null` 的恢复。
- 完成态残留 `planningReplan`。
- `T26` 在 `task-planning.integration.test.ts` 中没有独立测试块；该文件标题声称 T01—T28，但实际通过数量不能直接等同于 T26 已覆盖。
- 并发/二次读取只在 T38 做观察，不能作为并发保护或“第二次读取必定拒绝”的证明。

### 被其他门禁遮蔽的旧测试

`packages/cli/test/regression.test.ts:1705-1750` 的测试名为“session pointer that cannot be written atomically is left intact”，但在创建 `planning` 任务后直接调用 `start`，没有先完成三文件声明和确认。按当前实现，这条路径会在规划门禁处失败，而不会到达会话指针写入失败分支；测试却断言出现 `Failed to set current task`。

在当前 Windows 环境该测试被 `skipIf(!canProvokePermissionFailure)` 跳过，因此没有暴露。若在支持权限注入的非 Windows 环境运行，它应因错误信息不匹配而失败，且即使断言被放宽，也不能证明指针原子写错误已被覆盖。需要先完成规划确认，再验证指针失败。

## 逐项覆盖判断

| 条款 | 当前判断 | 说明 |
| --- | --- | --- |
| R1 | 部分通过 | 文件可读、非空、UTF-8、指纹规则已通过；语义质量本来就不属于机器保证。 |
| R2 | 不通过 | 坏声明可由普通 `attest` 覆盖，违反不静默重写。 |
| R3 | 部分通过 | 正常确认绑定原始 `reviewFiles` 的路径通过；半成品和坏记录路径未通过。 |
| R4 | 基本通过 | 勘误链正常路径、无变化和错误链有测试；D5 的异常记录清洗仍阻断。 |
| R5 | 不通过/部分 | 正常回规划可走通，但坏记录可被清除，`--independent` 默认值也不一致。 |
| R6 | 部分通过 | 首次开工的基本拒绝无指针/钩子副作用通过；坏记录和二次读取边界仍有缺口。 |
| R7 | 不通过 | `validate` 对 `planning + ready` 的错误状态返回 0。 |
| R8 | 部分通过 | 旧实施任务恢复和 archive 基本路径通过；坏 meta/null 回规划不满足 D5。 |
| R9 | 部分通过 | 未知顶层/meta 保留、原子写入和两树一致性有证据；状态清洗仍违反失败语义。 |
| R10 | 不在本报告定论 | 平台来源、生成内容和渲染边界由另一审查者负责。 |
| R11 | 不通过/未完成 | 定向测试通过，但上述关键反例未覆盖；同条件旧新对照和全量失败分类不在本报告完成。 |

## 明确不在本报告保证内的内容

- 不声称程序能验证真实用户身份、真实聊天来源或“用户确实同意”。
- 不判断三份规划文本的语义是否完整、是否自相矛盾。
- 不证明同任务并发写入安全；T38 只是观察。
- 不覆盖平台模板、生成器、OpenCode 渲染、市场工作流；由另一审查者审查。
- 未在本报告内重新执行完整旧新版本对照、全量测试或模板全量回归；这些结果不能由核心 27 项代替。

## 当前建议给主会话的下一步

1. 先修 P1：普通 `attest` 和 `replan` 必须在删除或替换旧记录前，对当前记录执行结构验证；坏记录拒绝且原字节不变。
2. 修 P1：`validate` 不得把带 `errors` 的 `ready` 当作成功；`planning + approval` 应返回 1。
3. 修 P1/P2：`planningReplan` 必须根据“键是否存在”检查 `null`；完成态残留也应报告为无效或警告。
4. 补测试：上述四个反例、T26 场景，以及完成态残留回规划。
5. 修正被规划门禁遮蔽的指针写入权限测试，先完成声明和确认再制造指针失败。
6. 重新运行核心测试、Python 3.9 链路、旧回归和完整证据链后，再由独立审查者复审；在此之前不得把 A 标记为完成或提交为已验收实现。

---

# 追加复审（2026-11-13）

> 本节只追加结果，不修改上文原发现及其证据。复审对象是原报告的 P1/P3 核心问题和对应测试缺口；平台产物与主会话负责的 T31 子场景不在本轮范围。

## 复审结论

**原报告的三个 P1 和 P3 已闭环修复；本范围内未发现新的阻断。**

原报告仍保留为历史发现。上面的“阻断”结论适用于修复前版本，不代表 2026-11-13 当前代码状态。

## 逐项定向核验

### 1. 原 P1：`planning + planningApproval` 的 `validate`

修复点：

- `common/planning.py` 仍将该状态标为 `ready` 并附带错误，未改冻结契约。
- `common/task_context.py:199` 改为仅在 `check.mode in ("ready", "waiting_confirmation") and not check.errors` 时走成功分支。
- 带错误的 `ready` 会进入 `task_context.py:203-206` 的错误分支，累计错误并返回 1。

真实命令复验：

1. 正常 `attest`、带确认 `start`。
2. 将状态改回 `planning`，保留自洽的声明和确认。
3. 执行 `validate`。

结果：退出码 `1`，输出点名 `planningApproval`，`task.json` 原字节未变。**修复闭环。**

### 2. 原 P1：坏记录被普通 `attest` 静默覆盖

修复点：

- `common/planning.py:245-250` 改为按“键是否存在”验证，`null` 不再被 `is not None` 跳过。
- `common/planning.py:550-553` 在普通声明和勘误分支之前统一调用 `record_errors(data)`。
- `task.py:550` 同上，坏记录会先被拒绝，不会进入构造新声明的代码。

真实命令复验了三种坏 `planningAttest`：`null`、字符串 `"broken"`、`{"schemaVersion": 2}`。三种均返回 `1`，点名 `planningAttest`，`task.json` 原字节不变。**修复闭环。**

### 3. 原 P1：坏记录被 `replan` 清除洗白

修复点：

- `task.py:663-666` 在检查回规划参数和删除旧记录之前调用 `record_errors(data)`。
- `common/planning.py:249-252` 对键存在但值为 `null` 或形状错误的 `planningReplan` 报错；非 `planning` 状态残留该键也报错。

真实命令复验了四类输入：

- 坏 `planningAttest: null`
- 坏 `planningApproval: null`
- 坏 `planningReplan: null`
- 形状正确但出现在 `in_progress` 的 `planningReplan`

四类均返回 `1`，点名对应键，`task.json` 原字节不变。原“先删后写”的洗白路径已不存在。**修复闭环。**

### 4. 原 P1/P2：实施态 `planningReplan: null` 被当作可恢复

修复点：

- `record_errors` 按键存在检查 `null`，`check_planning` 因而返回 `invalid`。
- `task.py` 恢复路径只接受 `ready` 或真正的 `legacy_resume`，不会再接受这个半成品记录。

真实命令复验：

1. 完成正常声明和确认，处于 `in_progress`。
2. 在 `meta` 中增加 `planningReplan: null`。
3. 执行不带确认参数的普通 `start`。

结果：退出码 `1`，点名 `planningReplan`，任务文件原字节未变，钩子计数未变。**修复闭环。**

### 5. 原 P2：完成态残留 `planningReplan` 未报告

修复点：

- `record_errors` 把“非 planning 状态存在 `planningReplan`”记为错误。
- `task_context.py:194-198` 对完成态把记录错误和文件问题统一转成规划警告，保留完成态不阻断的现有规则。

真实命令复验：完成态加上 `planningReplan: null` 后执行 `validate`，退出码 `0`，输出包含 `Warning: ... planningReplan`，原文件未变。**修复闭环。**

### 6. 原 P3：省略 `--independent` 与默认 `none` 不一致

修复点：

- `task.py:669-671` 在参数为空时显式赋默认值 `"none"`。
- 帮助文本仍写 `default: none`。

真实命令复验：对 `review` 任务执行 `replan --reason change --affected all`，未传 `--independent`。退出码 `0`，状态变为 `planning`，`planningReplan.independentWork` 为 `"none"`。**修复闭环。**

## 新增反例测试核验

新增测试确实覆盖原报告指出的缺口：

- `task-planning.integration.test.ts` 的 T09 反例覆盖普通 `attest` 不得覆盖坏记录，包括三种坏 `planningAttest`、坏 `planningApproval`、坏 `planningReplan`，以及真实 JSON 浮点 `schemaVersion`。
- T20 反例覆盖 `replan` 不得清除坏记录，包括坏声明、坏确认、坏回规划以及实施态残留回规划。
- T20 还覆盖省略 `--independent` 的默认 `none`。
- `planning-status.integration.test.ts` 覆盖 `planning + approval` 的 `validate` 拒绝、`null` 回规划旁置合法确认时 `invalid`，以及完成态回规划残留的逐项警告。
- T26 已有独立测试块，覆盖普通代码/测试/进度记录不改规划指纹，以及规划材料变化后必须回规划、重新声明和重新确认。

这些测试不是只检查关键字；它们通过真实 `task.py` 子进程和临时 Git 仓库驱动命令，并对 `task.json` 原字节、指针和钩子做断言。

## 独立复跑证据

本轮重新执行，不采用仅由原测试报告转述的结论：

```text
pnpm --filter @mindfoldhq/trellis exec vitest run test/scripts/planning-status.integration.test.ts test/scripts/task-planning.integration.test.ts --reporter=dot
```

结果：`2 passed (2)`，`96 passed (96)`。

本轮真实命令反例结果：

- `planning + planningApproval` 的 `validate`：退出 1，原字节不变。
- 坏 `planningAttest` 的普通 `attest`：三种形状全部退出 1，原字节不变。
- 坏记录的实施态 `replan`：四类全部退出 1，原字节不变。
- `planningReplan: null` 的实施态恢复：退出 1，原字节和钩子不变。
- 省略 `--independent`：退出 0，记录 `"none"`。
- 完成态回规划残留：退出 0，并输出规划警告。

两套脚本目录相关文件哈希一致：

- `common/planning.py`：两树均为 `30C25F731676629A82E5780AC7288A5AF018E7579E82F092B6997DC71105CBFF`
- `task.py`：两树均为 `97E03D59839C04B98B510855CC4C46CF2EE773A462F26F4516F7D187484D942A`
- `common/task_context.py`：两树均为 `A4D8FAD30C48A85399DDBEAF3F197F1FAE3F0C9AD95FDB5F6D457B932EB2DE6D`

## 复审后仍保留的边界

- 本轮未重新覆盖平台模板、OpenCode 渲染、marketplace 工作流或主会话负责的 T31 其他平台子场景。
- 本轮未判定真实用户身份、审阅文本语义，也未把测试通过解释为“用户确实批准”。
- 本轮未运行完整全量测试和旧新版本同条件对照，因此不据此宣称整个 A 任务全部通过。
- T38 仍只是并发观察，不是并发保护证明；二次读取与“同一任务单一写入者”的前提没有变化。
- 原报告中的“测试遮蔽”问题由主会话另行修复；本轮未把它改写成已通过。

## 复审给主会话的可行动结论

原报告三个 P1 与 P3 可以关闭，冻结设计无需修改。当前核心门禁的反例闭环成立。

在提交或最终验收前，仍需由主会话完成其负责的测试遮蔽修复、平台复审、全量失败分类和同条件对照；这些未完成事项不能再被本报告的“核心 96 项通过”替代。
