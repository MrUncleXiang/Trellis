# A：技术设计

## 状态与设计出发点

依据：[当前需求](prd.md)。本文件为待审技术设计，尚未实施，也不是用户已经批准每个命令或字段的记录。

三份材料像一套施工图：`attest` 是编制者盖章“这套图我核对过”，用户确认是“同意按这套图开工”，`start` 是带着对应图号登记开工。改错别字可附勘误；改施工方向必须重新送审。三者不能混成一个布尔值。

采用一个共享 Python 模块、三个新增查询/管理入口（attest、replan、planning-status）及现有start参数扩展、既有 `planning`/`in_progress` 状态；不增加审批服务或新的顶层状态。所有新命令均是本设计建议，实施前随三份材料一起审阅。

## D1：共同文件检查与指纹

新增 `packages/cli/src/templates/trellis/scripts/common/planning.py`，同步到 `.trellis/scripts/common/planning.py`。只用标准库，兼容 Python 3.9；新模块文件顶部明确声明 `from __future__ import annotations`，受影响旧模块保留该声明，避免3.9在导入时求值联合类型注解。`planning.py` 依赖路径/读写/日志等基础模块，不反向导入 `task.py`、`task_store.py` 或 `task_context.py`，避免共同检查引入循环依赖。文件名常量只定义一次：

```python
ARTIFACTS = ("prd.md", "design.md", "implement.md")

def artifact_fingerprints(task_dir: Path) -> tuple[dict[str, str], list[str]]:
    fingerprints: dict[str, str] = {}
    errors: list[str] = []
    for name in ARTIFACTS:
        try:
            raw = (task_dir / name).read_bytes()
            text = raw.decode("utf-8")
        except (OSError, UnicodeError) as error:
            errors.append(f"{name}: unreadable UTF-8 text ({error})")
            continue
        if not text.strip():
            errors.append(f"{name}: empty or whitespace-only")
            continue
        canonical = raw.replace(b"\r\n", b"\n")
        fingerprints[name] = hashlib.sha256(canonical).hexdigest()
    return fingerprints, errors
```

只归一化 CRLF 为 LF；不删除末尾空格、不排序、不去掉注释、不自动改文件。单独 CR、BOM、末尾换行及任何其他内容变化都进入指纹。拒绝目录、不存在、解码失败、权限错误、空白文件并点名文件。对只含标题、模板壳、互相矛盾的文档不做语义打分；它们不能因机器通过就被宣称合格。

先用 `read_json_checked` 加载对象；`status` 必须属于 `planning`、`in_progress`、`review`、`completed`。`meta` 缺省作空对象；存在但不是对象则报错。检查不得通过 `or {}` 吞掉坏类型。

## D2：记录形状与版本身份

复用 `task.json.meta` 扩展点，不变更 24 个顶层标准字段，不经 `set-meta` 的字符串接口写嵌套对象。三项对象：

```typescript
// 设计契约；不新增公共 TypeScript SDK 类型。
type Files = Record<"prd.md" | "design.md" | "implement.md", string>;
type PlanningAttest = {
  schemaVersion: 1;
  reviewId: string;             // uuid4().hex，每次实质待审重新生成
  attestedAt: string;           // 带时区 UTC ISO 8601
  note: string;                 // 原待审说明
  reviewFiles: Files;           // 用户所审版本的原始三文件指纹
  files: Files;                 // 经勘误后当前生效的三文件指纹
  editorialChanges: Array<{
    recordedAt: string;
    note: string;
    before: Files;
    after: Files;
  }>;
};
type PlanningApproval = {
  schemaVersion: 1;
  reviewId: string;
  reviewedFiles: Files;
  recordedAt: string;
  note: string;                 // 用户答复原话或忠实摘录
  source: string;               // 可回查的消息标识/日期和会话定位
};
type PlanningReplan = {
  requestedAt: string;
  reason: string;
  affectedWork: string;
  independentWork: string;      // 默认 none；非空不等于自动批准
};
```

`meta.planningAttest` 保存待审版本，`meta.planningApproval` 保存开工时声明的用户确认，`meta.planningReplan` 保存当前暂停范围。不增加 `approved=true`，不伪装验证了用户身份。新记录严格检查结构、版本、三份键、64位小写十六进制指纹、非空字符串、勘误链连续性；未知模式版本拒绝开工并提示工具版本，不静默重写。`reviewId` 要求32位小写十六进制；时间要求可解析且有时区。`planningReplan` 若存在也须符合上述形状，并只允许在planning；实施态残留它是无效记录，不能按ready恢复。保留其他顶层键和其他 `meta` 项。当前三文件、记录与 `git` 历史共同追溯；本方案不承诺未提交且已覆盖的全文快照可自动恢复。

审阅记录的完整性分为两层；前两条属于持久记录自洽，第三条是已生效状态的文件匹配。不能把普通生效条件原封不动用于准备勘误的中间态：

1. 勘误链首个 `before` 等于 `reviewFiles`，每一项 `before` 等于上一项 `after`，最后 `after` 等于 `files`；空链要求两份指纹相等。
2. 确认的 `reviewId`、`reviewedFiles` 等于声明的 `reviewId`、`reviewFiles`。
3. 当前三份材料指纹等于声明的 `files`。
4. 持久化勘误链必须有对应确认记录；首次开工的勘误在内存中同时构造本轮确认及最终in_progress状态后，再核查完整对象，不要求磁盘先有确认。不得把尚未完整的中间对象写入任务，也不能给未审版本挂勘误沿用别的确认。

记录只是可审计声明；直接删除元数据或篡改状态仍可能绕过流程，属于“直接改记录”边界，不当作可信权限系统。

## D3：命令与返回值

以下示例的 `<dir>` 是任务路径，`<id>` 是本次 `attest` 输出的完整版本标识，不使用截断值进行比较。

### 1. 形成待审版本

```text
python .trellis/scripts/task.py attest <dir> --note "需求增加归档提醒，设计和验证步骤已同步"
```

仅 `planning` 可执行普通声明：读有效任务、检查三份文件和说明，生成新 `reviewId`，设置相同的 `reviewFiles` 与 `files`、空勘误链，移除旧 `planningApproval`，保留 `planningReplan`。每次普通声明均产生新版本，即使字节相同；输出版本、三份指纹、说明和“仍需用户审阅确认”。不改状态、分支、会话指针，不执行生命周期钩子。

`in_progress` 或 `review` 任务执行普通声明，拒绝并指向 `replan`，不能只换指纹就把实质变化洗成已批准。`completed` 不接受声明。

### 2. 送审与实际开工

工作流 1.4 依次执行：核对三份内容 → 普通声明 → `validate` → 在对话展示完整版本标识、声明说明和人能理解的方案摘要 → 等用户明确批准 → 立即复核版本并开工。

```text
python .trellis/scripts/task.py validate <dir>
python .trellis/scripts/task.py start <dir> --review <id> --approval-note "用户答复：同意按本次展示的方案实施" --approval-source "本会话 2026-11-12 对应审阅摘要后的用户消息"
```

首次开工或回规划后开工，三个参数都必填且非空白。先检查 `--review` 与当前 `reviewId` 完全相同，再检查当前文件指纹、结构及原有上下文清单。全部通过才在**同一次 task.json 写入**中保存确认、状态变为 `in_progress`、按原逻辑填充空分支并移除 `planningReplan`。输出确认出处、版本和声明说明。不会自动从聊天中查证批准，参数必须来源于真实的审阅后用户答复，不能把“允许整理规划”当开工确认。

确认后若材料有实质修改：重新普通声明产生新版本；旧 `--review` 无法使用。使用新版本则必须先在对话重新展示并取得确认。模型填入假的新确认仍超出程序识别能力，文档和验收必须如实写明。

普通 `in_progress`/`review` 恢复不接收这组三个确认参数，以免把恢复伪装成新授权；新版任务按 D5 检查已保存确认和当前版本。旧任务仍走原清单规则。`completed` 拒绝 `start`。

### 3. 非实质勘误

```text
python .trellis/scripts/task.py attest <dir> --editorial --note "仅将设计中的归挡改为归档，行为、范围和验证不变"
```

只接受已有有效确认及同版本声明的 `in_progress`、`review` 任务；不接受 `planning`、`completed` 或带待复核 `planningReplan` 的记录。允许当前文件与有效 `files` 不同，但原记录链本身必须有效，三份当前文件仍须可读非空。保留 `reviewId`、`reviewFiles` 和原确认，追加原 `files` 到新指纹的勘误项，更新 `files`。无内容差异时返回 0、报告无变化，不写记录。不会默默替用户认定无实质变化；说明必须具体，主会话和审查者核对修改前后差异。尚未取得用户答复的待审版本有任何修改，重新普通声明再送审即可。

**确认答复已取得、尚未登记首次开工**时，确认记录尚未写入，不能运行上述勘误命令。使用同一 `start` 额外携带 `--editorial-note`，继续指定用户审过的原 `reviewId`，在内存构造一项从原 `files` 到当前文件的勘误；要求原声明结构/链有效、尚无已登记确认、三个确认参数完整且对应原待审版本。原指纹差异仅在这条显式声明为非实质的路径可接受；缺参数、空说明或 `reviewId` 不匹配仍拒绝。它与确认和状态在同一次写入保存，不先重算普通声明，不重复向用户询问。只允许规划态，不能用于实施态恢复，也不能省略真实的用户确认来源。`replan` 后的待审版本同样可以在已经取得本轮确认答复后使用；旧批准不能复用。

```text
python .trellis/scripts/task.py start <dir> --review <id> --approval-note "用户已同意刚才展示的这一版" --approval-source "对应会话消息定位" --editorial-note "确认后仅修正归挡为归档，不改变含义"
```

没有文件差异却传此参数，返回1并提示移除多余参数，不生成虚假勘误。勘误实际改了含义仍是违规；程序不承诺识别这种伪装。保存前再次核对当前指纹与此次准备的 `files`，不能沿用更早读到的内容。

链路记录保留每次勘误说明和前后指纹，不要求用户因错别字重复批准。不新增自动分类器；错误使用 `--editorial` 的风险属于审阅责任。不得把这个参数说成安全绕过实质变更审批的方法。

### 4. 实施中回规划

```text
python .trellis/scripts/task.py replan <dir> --reason "验收从仅本地保存变为允许上传" --affected "保存接口、隐私说明及其依赖测试" --independent "无"
```

`in_progress`/`review` 才允许，要求有效任务和非空原因、影响范围。先暂停受影响的执行或已派发工作，再调用命令：一次写入使 `status=planning`，新增 `planningReplan`，清除旧声明和旧确认。保留分支、会话定位、既有实现和其他元数据。不删除或回滚代码，不触发 `after_start`。工作流要求在三份材料中更新变化、依赖和验收；没有某份文件的旧任务在恢复前补齐。

再次调用 `replan`（已是 `planning`）拒绝，不重写原因或伪造新暂停记录；直接在材料中补充影响。随后走普通声明、审阅、再次确认和 `start`。任务层回到规划表示“当前变化待审”，不是抹去已经完成的代码。确有独立工作只可在原确认范围内继续，说明为什么不依赖受影响部分；没有充分依据就暂停。程序不逐个强制停工作进程，不提供新的调度或写入门禁。

## D4：共享检查接口和调用规则

`common/planning.py` 提供以下内部接口，名称在计划、测试中保持一致：

```python
@dataclass
class PlanningCheck:
    mode: str  # ready, waiting_confirmation, drift, invalid, legacy_resume, completed
    errors: list[str]
    review_id: str | None
    note: str | None
    approval_note: str | None
    approval_source: str | None
    changed_files: list[str]

# 对外接口形状（函数体在实施批次中实现）
# record_errors(data: dict) -> list[str]
# check_current_files(task_dir: Path, expected: dict[str, str]) -> tuple[dict[str, str], list[str]]
# check_planning(task_dir: Path, data: dict) -> PlanningCheck
# planning_summary(task_dir: Path, data: dict) -> dict
# cmd_attest(args: argparse.Namespace) -> int
# cmd_replan(args: argparse.Namespace) -> int
```

`record_errors` 只验证任务基础形状、记录字段、版本对应与链连续，不读当前三文件，因此不会把合法的待勘误文件差异当坏记录。`check_current_files` 调用D1读取与指纹逻辑，返回实际指纹和文件读取/内容差异问题；不检查审批真实性。`check_planning` 组合两者生成普通只读状态，`validate` 和普通 `start` 使用它。

勘误路径只对“当前文件与原files不符”采用特殊处理，任何结构/确认/链错误都不得忽略：

1. `attest --editorial` 先 `record_errors(data)`（已有确认必须有效），再用D1读取当前非空文件，构造新链对象，之后对拟保存对象重新执行 `record_errors` 和 `check_current_files`；全部通过才写一次。
2. `start --editorial-note` 先验证磁盘上原planning声明的无确认空链是有效的，再构造本轮拟写确认、勘误链、in_progress状态并移除replan项。对这个完整的内存对象执行两层检查，通过后一次保存；不是在磁盘上先写勘误再等确认。
3. 普通 `start` 不忽略当前文件差异；`validate` 对尚未登记的勘误仍报告漂移，只有明确勘误路径完成后才恢复匹配。没有通用 `skip_validation` 或 `allow_drift` 绕过开关。

这里的函数声明定义接口，不是已存在的实现。`check_planning` 只读、确定性输出，不负责写入、不读会话身份、不声称用户已真实批准。规划无有效声明是错误；声明有效且没有批准时为 `waiting_confirmation`，可以送审。新格式实施态必须有效确认并匹配当前链；否则 `invalid`/`drift`。旧格式实施态只有在三个新键都**不存在**时才 `legacy_resume`；键为 null、坏类型或缺一半不能当成旧任务。

### start 的确定性判定

| 任务状态与共同检查结果 | 参数与补充条件 | 处理 |
| --- | --- | --- |
| planning + waiting_confirmation | 三个确认参数完整、reviewId完全匹配，无文件差异 | 准备确认，一次保存后开工；等待确认模式本身不是拒绝理由 |
| planning + waiting_confirmation | 任一确认参数缺失/空白或reviewId不符 | 返回1，无副作用 |
| planning + drift | 只有当前文件指纹差异；--editorial-note非空、三参数对应原版，其余记录结构全部有效 | 准备勘误与确认，再校验准备后的完整链；通过才一次保存；不能豁免其他错误 |
| planning + ready | 已有确认但仍planning，不是正常原子开工产生的状态 | 返回1，先核查/修复记录；不悄悄沿用这个半成品状态 |
| in_progress/review + ready | 不带确认/首次勘误参数，记录及文件匹配 | 普通恢复，保留原上下文检查 |
| in_progress/review + legacy_resume | 三个新键完全不存在，不带确认/首次勘误参数 | 历史兼容恢复，保留原上下文检查 |
| 其余invalid/drift/completed，或状态与模式不符 | 无适用的显式首次勘误路径 | 返回1，不修改状态、分支、指针或钩子 |

共同检查必须先区分“结构错误”和“仅当前文件差异”，`changed_files`不能代替全部`errors`的判断。正常首次开工中的 `waiting_confirmation` 由本次真实用户答复参数转换为批准，不要求事先有不存在的批准记录。参数真实性仍是工作流责任，测试不能假装程序能从字符串辨认真假答复。

- `validate`：先现有 JSONL 校验，再调用共同检查。`ready`、`waiting_confirmation`、`legacy_resume` 可返回 0，但后两者明确提示“尚待用户确认”或“历史兼容，未校验规划版本”。漂移、损坏、缺材料返回 1。已完成/归档任务只提示规划问题，不要求补档；保留原清单校验的原有退出规则。
- `start`：有效任务及状态 → 共同检查 → 规划态参数检查（如有显式勘误则先校验结构并准备内存勘误，不能把可记录的文件差异提前当最终失败）→ 原上下文清单门禁 → 再读记录和文件确认未漂移 → 状态及确认写入 → 会话定位（如有身份）→ `after_start`。不得因缺会话身份跳过任一前置检查。
- `archive`：原有任务、分支、合并等检查保持；调用共同检查把缺文件、陈旧声明、缺确认转成逐项警告，继续原流程。不要把本要求误解成取消现有归档阻断。

无效输入返回 1，参数解析错误沿用 argparse 返回 2；合法命令 0。任何前置检查拒绝均不写状态、分支、指针或运行钩子。保存 task.json 失败返回 1，不修改指针、不运行钩子。任务状态与会话指针是两个文件，不能假装跨文件事务：状态保存成功而指针失败时，返回 1、准确报告“已登记开工，定位未保存，重试恢复”，保留已批准的状态，钩子不运行；重试按恢复处理。无身份降级允许登记开工但明确不保存指针。文件再次检查仍不能消除并发写入的极短竞态。本版明确以“同一任务只有一个状态写入者”为前提：不同任务可并行，同一任务的start/attest/replan由主会话串行，派发工作不自行改任务状态；不增加多进程锁或事务服务。重复串行start仍按原恢复规则可能再次执行after_start，不能保证钩子恰好一次；两个并发start不受支持，可能出现最后写入者覆盖确认、两个指针及重复钩子。能在第二次读取发现的变化返回1，但不承诺总能检测并发。测试T38只观察并报告这个边界，不把双成功伪报为已实现并发保护。

## D5：兼容和状态矩阵

| 输入状态 | 新记录情况 | 行为 |
| --- | --- | --- |
| planning | 无声明/空文件/坏声明/漂移 | 拒绝开工，回到补材料或声明步骤 |
| planning | 有效声明、无确认 | validate 可送审；start 需要真实确认的版本及参数 |
| in_progress 或 review | 三个新键都不存在 | 按既有方式恢复，不补历史材料；仍保留原上下文清单门禁 |
| in_progress 或 review | 有新版声明/确认 | 检查完整链及当前版本，漂移就停止受影响工作、判断勘误或回规划 |
| in_progress 或 review | 有实质变化 | replan，回 planning，重新审阅；旧任务也适用 |
| completed | 任意 | 不 start、不 attest、不 replan；归档仅规划提醒 |
| 缺失、损坏、未知 status 或坏 meta | 任意 | 拒绝 start/声明/回规划，点名修复；不按历史任务处理 |

普通代码及测试文件修改不属于三个规划文件，因此不会让指纹过期。实施计划是已审指令，执行时不直接在 `implement.md` 勾选或追加运行结果；在 `research/implementation-progress.md` 按原步骤编号记录完成情况、命令和证据，首次实际执行时创建。正常进度不需要重新确认。若确实需要改变步骤含义，则按实质变化处理；只修正文案则走勘误。程序仍对三份规划原文计算指纹，不引入忽略复选框、忽略代码块等隐式归一化。不改变原任务创建与会话定位：`create` 仍可定位 `planning` 任务；这个定位既不是 `start`，也不是实施授权。对话中的变更即使尚未写入文件也需要按 R5 暂停；程序无法从对话自动推断它。

## D6：实际接入位置

| 层面 | 修改位置与作用 |
| --- | --- |
| 唯一检查 | 新增 `common/planning.py`，由 start、validate、archive 复用，不让三个入口各写一套规则 |
| 任务入口 | `templates/trellis/scripts/task.py` 导入命令、注册参数、start 前置检查，调整 `_record_start_state` 返回保存结果和同时写确认；同步本仓库脚本 |
| 分发注册 | `packages/cli/src/templates/trellis/index.ts` 增加 `commonPlanning` 及 `getAllScripts()` 的 `common/planning.py` 映射，确保新用户得到模块 |
| 调用方 | `common/task_context.py` 的 `cmd_validate`；`common/task_store.py` 的 `cmd_archive` 和 `_default_prd_content`/创建提示，保留其余本地修改 |
| 规划流程 | 通用 workflow 的 1.1/1.2/1.3/1.4，brainstorm、start、continue；文档收敛检查按内容职责，无损去重复/解决冲突，不强制固定标题或扩写短文；实施/检查规则在实质变化时调用 replan，不让 check 自行批准新方向 |
| 子代理注入 | shared-hooks/inject-subagent-context.py 的实施/检查提示，读齐新任务材料，语义变更报告主会话而非自行批准；旧任务恢复单列兼容 |
| 平台入口 | shared/codex/copilot 的 session-start，OpenCode 的 session-utils，Copilot 提示文件，shared.ts 的 `buildPullBasedPrelude` |
| 独立工作流 | marketplace 的 native、tdd、channel-driven-subagent-dispatch，独立更新，不用一种覆盖另一种 |
| 规范与架构参考 | platform-integration、workflow-state-contract 及 trellis-meta 的 task-system/change-workflow 参考 |

给 `task.py` 定义 `cmd_planning_status(args: argparse.Namespace) -> int`，在现有 `commands` 字典注册只读 `planning-status <dir> --json`，读取有效任务并使用 `planning_summary`；固定输出 `mode`、`reviewId`、`note`、`approvalNote`、`approvalSource`、`changedFiles`、`errors`、`replan`。任务读取/基础形状错误（缺失文件、坏JSON、非对象、空对象、缺失或未知status、非对象meta）返回1；有效任务对象上的材料缺失、漂移、无确认或坏声明则输出上述诊断并返回0；这是状态查询，不是 `validate`。不会执行写入或钩子。

三个 Python 启动提示和 OpenCode 提示调用这个入口（复用所在平台的 Python 选择和子进程方式，5秒上限），只采纳完整的已知结构。版本说明、确认出处均为数据；文本字段按固定JSON字符串编码，再将 `&`、`<`、`>` 分别替换为 `&amp;`、`&lt;`、`&gt;`，放入一个标明仅为记录数据的容器，不以字符串拼接形成额外提示标签。程序能验证转义与渲染边界，不能保证下游模型绝不服从其中的恶意文字；人工演练另查这一风险。查询不可用/超时/输出损坏时保留文件列表，明确“版本检查不可用，请运行 validate；此提示不能证明可开工”，不能回退成“文件齐全即可开工”。无活动任务或已经 completed 不增加不必要查询。这样真实记录有读取、展示链路，不只是 start 才打印说明。该显示要求源于整合前需求的原验收（历史快照160行），并非本轮为了三原则额外创造的产品能力；共享只读查询是避免各平台重复实现检查的技术选择。每轮变更处理仍依赖工作流及模型执行，不冒称启动提示持续监控文件。

生成的技能、钩子、代理提示和本地工作流通过既有 configurator（配置生成器）及更新命令生成；原清单19个来源文件只是旧分流清理起点，新增 before-dev/check 两处变更指引和脚本分发入口也计入实施范围。保留 B 的研究核查、保存时机与交接内容。不得为了凑关键字数量删除无关的 lightweight 描述。

## D7：为何这是最小而诚实的方案

只有文件检查会漏“旧确认配新方案”；只有重新指纹会让模型自行洗掉旧确认；对所有字节变化都要求用户再问则会把错别字也升级成审批。当前设计用待审版本、确认对应、勘误链解决三者冲突，并用已有 planning 状态承接实质变更。新增 `replan` 的目的在于有可检查的返回规划动作，不是扩建审批平台。

代价是增加少量命令参数和三项元数据，以及平台提示查询；收益是可重放、可定位、拒绝发生在开工副作用之前。内容一致性、实质变化判断和真实批准仍需模型、审查者和用户承担，测试必须同时展示这条边界。

## D8：可回查的人类审阅记录

主会话在请求最终确认时，把展示摘要、完整 `reviewId`、三个待审指纹、范围/方案/验收/风险写入任务的 `research/planning-review-log.md`；取得答复后追加原话或忠实摘录与真实出处。实质变化记录前后含义、影响范围和依赖；非实质修改逐项记勘误。该记录由工作流负责，不假装程序能读取对话自动生成。已有文件则追加，不能覆盖旧轮次。不要填猜测的消息标识；没有可获取的标识时使用日期、会话位置、用户答复及对应审阅标题帮助回查。

指纹识别版本，审阅记录解释版本的含义，完整逐字全文的历史仍由Git（版本管理工具）提交承担。未提交前覆盖了旧全文，不能声称能自动还原全文。`replan`清除旧结构化声明与批准时，旧轮次回查依赖已追加的审阅日志及Git；日志未写成功且没有相应提交时，程序不保证自动恢复旧确认。主会话必须先保存旧轮展示和真实答复出处，保存失败先处理，不把命令成功当成完整审计已保全。程序诊断与测试报告对这一限制如实披露。

## D9：本任务自举

A本身实施前的新命令尚不存在，不能先实现命令再补批准。按[本任务自举记录](research/bootstrap-review-2026-11-12.md)，独立审查修正后先保存当前三份材料的人工版本清单及内容快照，展示摘要并取得针对该版的开工答复，再核对指纹并用当前已经存在的 `task.py start <dir>`。这只用于建设该门禁的本任务，不能成为新门禁启用后的普通绕过路径。A的执行进度仍另记，实质变更仍暂停受影响工作并重新确认。
