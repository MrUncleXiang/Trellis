# Trellis 欠账标记（trellis-defer）方案

> 状态：提案，未实施。本文只描述做法与判断，不含代码。
> 目标读者：Trellis 维护者，以及后续接手这块的 AI 会话。

---

## 一、要解决的问题

代码里有一类东西是**故意留下的**：旧参数别名、旧版本兼容分支、暂时不做的能力、明知道该统一却先放着的两份实现。

这类东西的共同点是：代码本身没毛病，能跑；但**为什么留着、什么条件下能删**只存在写它那个人的脑子里。

现有三处实例（已核实）：

| 位置 | 内容 | 缺什么 |
| --- | --- | --- |
| `packages/cli/src/cli/index.ts:83` | `.option("--windsurf", "Deprecated alias for --devin (Windsurf was renamed to Devin)")` | 没说留到什么时候、删前验证什么 |
| `packages/cli/src/commands/update.ts:116` | `LEGACY_UNTRACKED_AGENTS_MD_BLOCK_HASHES` 旧安装识别哈希集 | 没说这组哈希何时可退役 |
| `packages/cli/src/commands/update.ts:658` | "Detect if legacy Codex upgrade is needed." 旧 Codex 安装探测 | 同上 |

判断依据丢了以后，后来的人（今天更多是 AI）面对这段代码只有两个动作：

- 删掉 → 可能炸掉还在用旧名字的用户；
- 绕开 → 这段代码永久冻结，谁也不敢碰。

这就是问题本身：**不是代码差，是判断无法复原。**

### 反面证据：Aegis 做了这套东西，但一条都没用起来

Aegis v2.15.0 有完整的一条链：`docs/current/AEGIS_DEFERRED_LEDGER.md` 定格式，`scripts/aegis-deferred-ledger.py` 扫全仓库，`tests/helpers/test_aegis_deferred_ledger.py` 单测，`tests/e2e/layer1-fast-check.sh:132` 挂 CI 跑 `--fail-on-vague`。

在它自己仓库里跑：

```
> python scripts/aegis-deferred-ledger.py --root .
No Aegis deferred ledger markers found.
```

零条。唯一的标记出现在那份文档自己的代码块里，而扫描器会跳过 Markdown 围栏。grep 全部技能文件，没有任何一个技能要求 AI 写这个标记。

**结论：格式、脚本、测试、CI 关卡都齐，缺"什么时候必须写"的挂点，结果等于没有。** 所以本方案把落点（第四章）看得比格式（第三章）更重。

---

## 二、做法：写在现场，不建台账

在每个欠账处写一行固定格式的注释，脚本全仓库扫出来汇总。

```ts
// trellis-defer: owner=cli reason="windsurf 是 devin 的旧名，老用户脚本里还在用" until=0.8.0 verify="trellis init --windsurf 后 .devin/ 仍在"
```

Python 用 `# trellis-defer: ...`，Markdown 直接写一行。

### 为什么不用中心台账

台账和代码一旦分家，改代码的人不会回头更新台账，两边很快对不上，最后谁也不信台账。

### 不能写注释的文件怎么办

JSON / YAML 这类不允许注释的文件不写标记，把标记写到拥有这段行为的代码文件里。脚本只认关键字，不管注释前缀是什么。

### 它为什么住在 `.trellis/` 之外

这是唯一一个不在 `.trellis/` 里的 Trellis 记录。原生三套各管一段：spec 记"该怎么写"（长期）、任务目录记"这次为什么这么改"（到归档为止）、journal 记"会话干了什么"（按人按天）。

欠账标记回答的是第五个问题：**这块故意没做完、什么条件下回来处理。** 它进不了任何一层——spec 记的是规则（欠账是故意违反规则），任务归档就看不见（`.trellis/tasks/archive/` 已有 230 个任务，`task.py list-archive` 只列目录名），journal 是叙事没法按代码反查，`trellis mem` 靠关键词搜而欠账的难点恰恰是"你不知道有这回事"。

放在源码里，是因为只有贴着代码，改代码的人才会被强制看见。

---

## 三、标记格式

### 字段

| 字段 | 必填 | 写什么 | 为什么必须有 |
| --- | --- | --- | --- |
| `owner` | 是 | 负责的包键，如 `cli` / `core`（对应 `.trellis/config.yaml` 的 `packages:` 键） | 没人认领的欠账永远不会被还 |
| `reason` | 是 | 为什么现在还留着 | 防止后人当成垃圾删掉 |
| `until` | 二选一 | 版本号 `0.8.0` 或日期 `2027-01-01` | 脚本能算，到点自动报 |
| `when` | 二选一 | 事件描述，如"等 Codex 不再支持 `.agents/skills` 布局" | 脚本算不了，但至少写清了回来的条件 |
| `verify` | 是 | 处理时跑什么命令验证 | 防止拆了旧路径又炸新路径 |

`until` 与 `when` 至少有一个。两个都没有的标记不合法。

### 硬规则

**写不出 `until` 也写不出 `when`，说明这段东西不该留，当场删掉，不许写标记。**

这条是整套机制的唯一边界。它故意制造摩擦力：让人在"留下来并想清楚"和"直接删"之间做选择，而不是用一句标记把问题往后推。

### `until` 的写法只有两种形状

| 形状 | 例子 | 含义 |
| --- | --- | --- |
| 版本号 | `until=0.8.0` | 0.8.0 发版前必须处理完 |
| 日期 | `until=2027-01-01` | 这一天之前必须处理完 |

版本号必须写完整三段 `\d+\.\d+\.\d+`，允许 `-beta.1` 这类预发布后缀。**`v0.8`、`0.8`、`soon` 一律拒绝**——模糊的版本号等于没有。

### 版本跟谁比

跟这条标记所在文件**往上走最近的 `package.json`** 的 `version` 比。`packages/cli/src/cli/index.ts:83` 对应 `packages/cli/package.json`（当前 `0.6.17`），这样 monorepo 里不会串包。

**不要用 `.trellis/.version`。** 实测本仓库 `.trellis/.version` 写的是 `0.6.14`，而 `packages/cli/package.json` 是 `0.6.17`，两者本来就不一致；用 `.trellis/.version` 会让同一个 `until=0.6.15` 得出两种结论。

往上找不到 `package.json` 的文件，`until` 只能写日期。

### 过期怎么判

当前版本 `>=` until 即过期。因为 `until=0.8.0` 的意思是"0.8.0 发版前必须处理完"，所以流程是：发版时先把版本 bump 到 0.8.0，`release-preflight.js` 跑 `--expired`，`0.8.0 >= 0.8.0` 成立，直接挡住发版。这是整套机制里唯一一个真能拦住的口子。

预发布版不算到达：`0.8.0-beta.1 < 0.8.0`，所以 beta 阶段不会误报。

比较逻辑**不要重写**：`.trellis/scripts/common/session_context.py:369-418` 已有 `_parse_version` / `_compare_versions`，TS 侧 `packages/cli/src/utils/compare-versions.ts:11` 有 `compareVersions`。复用现有实现，不写第三份。

### 日期形态怎么比

`until` 只写日期、`when` 为空时，用系统日期直接比。`DUE SOON` 的窗口是 30 天。

---

## 四、格式怎么保证不出错

四层叠起来，缺一层就会出现"写下来的不对"或"该写的没写"。

| 层 | 防的是什么 | 靠什么 |
| --- | --- | --- |
| 出处 | 同一件事有两份描述，各自漂移 | 一份格式说明，别处只引用 |
| 写 | AI 自由发挥语法、引号漏了、字段名拼错 | 生成器子命令，输出就是合法行 |
| 查 | 残缺标记混过去 | 解析器拒绝未知字段、拒空值、拒模糊值 |
| 落点 | 根本没写 | 收尾清单 + 路由表里直接放完整范式 |

### 第一层：格式说明放哪

这份说明横跨所有包、不属于某一层，归 `.trellis/spec/guides/`——那里本来就是放跨层思考指南的地方（现有 code-reuse / cross-layer / cross-platform 三份）。

两处要写：

- `.trellis/spec/guides/deferred-marker-format.md`（本仓库自用），并在 `.trellis/spec/guides/index.md` 的 Available Guides 表格（第 22-26 行）加一行登记
- `packages/cli/src/templates/markdown/spec/guides/deferred-marker-format.md.txt`，再在 `packages/cli/src/templates/markdown/index.ts` 加一个 `readLocalTemplate` 导出，这样 `trellis init` 建的新项目也拿到

文档里只写字段表和三个合法样例，不写背景——它的读者是下一次要写标记的 AI。

### 第二层：写的时候不手写

`check_deferred.py` 带一个写入子命令：

```bash
python .trellis/scripts/check_deferred.py add \
  --file packages/cli/src/cli/index.ts --line 83 \
  --owner cli \
  --reason "windsurf 是 devin 的旧名，老用户脚本里还在用" \
  --until 0.8.0 \
  --verify "trellis init --windsurf 后 .devin/ 仍在"
```

脚本负责按扩展名加注释前缀（`.ts`/`.js`/`.tsx` 用 `//`，`.py`/`.sh`/`.yaml`/`.toml` 用 `#`，`.md` 不加）、给值加引号、按固定字段顺序拼行，然后**自己再解析一遍**才落盘。

写出来的必然合法，不存在"格式对不对"这个问题。

Aegis 没有这一步——它只能事后扫，人手敲的错只能等 CI 红一次才知道。

### 第三层：解析器必须拒绝什么

Aegis 的 `scripts/aegis-deferred-ledger.py:70-75` 有两个实测缺陷，本方案反着来：

```python
for token in shlex.split(payload, posix=True):
    if "=" not in token:
        continue          # ← 引号漏了，切碎的 token 被静默丢弃
```

`reason="windsurf 是 devin 的旧名"` 少一个引号，`shlex` 切出三个 token，后两个没有 `=` 被直接丢掉，`reason` 静默变成 `windsurf`。第 94 行又只检查字段"在不在"，所以 `trigger="later"` 也算合格——`--fail-on-vague` 这个名字是虚的。

Trellis 版本要拒绝：

| 情况 | 处理 |
| --- | --- |
| 未知字段（`owner` 拼成 `onwer`） | 报错，退出码 1 |
| 值没加引号被切碎（有残留 token） | 报错 |
| `until` 与 `when` 都缺 | 报错 |
| `until` 不是三段式版本号或 ISO 日期 | 报错 |
| `when` 是"以后""下个版本""有空再看""later""TBD"一类 | 报错，硬编码黑名单 |

### 第四层：收尾时能直接抄

`.trellis/spec/` 是 AI **可能**读的，`packages/cli/src/templates/common/skills/check.md` 是收尾时**一定**会读的。所以 Scope Discipline 那条不能只写"见某文档"，要把整行范式直接放在那里：

```
- [ ] 留下了旧代码却没写标记？要写就照这个形状，字段顺序不要改：
      // trellis-defer: owner=cli reason="..." until=0.8.0 verify="..."
```

---

## 五、扫描脚本

两个新文件，按仓库现有约束必须两树逐字节一致（`packages/cli/src/templates/trellis/scripts/**` 与 `.trellis/scripts/**`，见 `.trellis/spec/cli/backend/filesystem-safety.md:115-124`）：

- `.trellis/scripts/check_deferred.py` — 入口
- `.trellis/scripts/common/deferred.py` — 库模块

### 命令

```bash
python .trellis/scripts/check_deferred.py                    # 列出全部，退出码 0
python .trellis/scripts/check_deferred.py --expired          # 只看过期的，有则退出码 1
python .trellis/scripts/check_deferred.py --changed a.ts b.py # 只看指定文件
python .trellis/scripts/check_deferred.py --strict           # 有残缺标记则退出码 1
python .trellis/scripts/check_deferred.py --json             # 机器可读
```

### 扫描规则

- 从 `get_repo_root()` 起向下遍历。
- 跳过：`.git`、`node_modules`、`dist`、`__pycache__`、`.trellis/tasks/archive`。
- 读不动的文件（编码错误、权限）直接跳过，不报错。
- `.md` 跳过代码围栏内的行，避免文档里的示例标记被当真。

### 退出码

| 码 | 含义 |
| --- | --- |
| 0 | 扫描完成；`--strict` / `--expired` 下也没有问题 |
| 1 | `--strict` 下存在残缺标记，或 `--expired` 下存在已过期标记 |

只报"标记写得不全"和"已经到期"，不报"条目变多了"。数量增长不是错误，是事实。

### 输出

```
packages/cli/src/cli/index.ts:83  [EXPIRED]  0.8.0 <= 0.8.0
  owner:  cli
  reason: windsurf 是 devin 的旧名，老用户脚本里还在用
```

四种状态：`EXPIRED`（已过期）、`DUE SOON`（下个版本或 30 天内）、`OK`、`MANUAL`（只有 `when`，脚本判不了，只列出来，不参与退出码）。

### 实现约束（照仓库既有约定）

- 入口脚本：`#!/usr/bin/env python3` + 模块 docstring 写 Usage + `from __future__ import annotations` + `from common.paths import get_repo_root` + `def main() -> int` + `if __name__ == "__main__": sys.exit(main())`。
- 库模块：docstring 列 Provides、相对导入、`# ====` 分节。
- Windows stdio：不内联编码处理，`from common` 自动生效（见 `common/__init__.py`）。
- 输出走 `common/log.py` 的 `log_info` / `log_warn` / `log_error`，不直接 print 带颜色的字符串。
- JSON 读写走 `common/io.py` 的 `read_json` / `write_json`。
- `pyrightconfig.json` 已覆盖 `.trellis/scripts/**/*.py`，新文件自动纳入类型检查。

---

## 六、什么时候检测

四个时刻，分两类：人主动查的，和挂到既有流程上自动跑的。只有挂上去的那几个靠得住。

| 时刻 | 谁跑 | 扫多大范围 | 能自动判到期 |
| --- | --- | --- | --- |
| 改代码当场 | AI 或人 | 正在改的文件 | 不能 |
| 任务归档（`after_archive` 钩子） | 脚本自动 | 本任务改过的文件（`--changed`） | 能 |
| 发版前（`release-preflight.js`） | 脚本自动 | 全仓库 `--expired` | 能 |
| 随时手动 | 人 | 全仓库或指定文件 | 能 |

**改代码当场**是唯一真正的入口，也是最不可靠的一个——"这段代码是不是故意留的"只有改它的人知道，脚本看不出来。所以这一环靠第四章第四层那条硬问句。

**任务归档**最有用。`.trellis/config.yaml` 已有 `after_archive` 钩子（现有 `after_create` / `after_start` / `after_finish` / `after_archive` 四个，每个收到 `TASK_JSON_PATH`，失败只警告不阻断），在那里按本任务改过的文件跑 `--changed`，只报这次碰到的文件，不刷屏。这一步能防的正是最坏情况：新代码加上了，旧的没删，也没人提。

**发版前**是唯一能拦住的口子。

---

## 七、谁负责登记

### 1. 收尾检查清单

`packages/cli/src/templates/common/skills/check.md` 的 Scope Discipline 小节追加一条（含完整范式，见第四章第四层）。

### 2. 规范更新路由表

`packages/cli/src/templates/common/skills/update-spec.md` 的触发条件表追加一行：

```
| **有意留下的旧路径 / 未完成事项** | 旧别名、历史哈希兼容、暂时不做的能力 | 在代码现场写 trellis-defer 标记，不进 spec |
```

### 3. 工作流收尾步骤

`.trellis/workflow.md` 的 `#### 3.3 Spec update` 补一句：判断"要不要改 spec"时，顺带判断"这是不是一笔该登记的欠账"，再回看跟本任务相关的旧标记，已到期的当场处理。

### 4. 归档钩子

`.trellis/config.yaml` 的 `hooks.after_archive` 加一条调用 `check_deferred.py --changed <本任务改动文件>`。

### 前置阻塞已解除（2026-11-11）

`.trellis/workflow.md` 原本落后 `packages/cli/src/templates/trellis/workflow.md` 两笔提交，已同步完毕，现在两边逐字节相同（都是 `eb4508a4…`，721 行），`.template-hashes.json` 里的记录也一并改到 `eb4508a4…`。

落后的两笔是：

- `60d6fbff`（2026-08-19）加 `[workflow-state:task_error]` 块 —— 修"A 任务记录坏了，AI 以为没任务又建一个重复的"
- `6358c00b`（2026-08-27）加空清单拦截 —— 修"53% 的实地任务带零上下文跑子代理"

之所以追不回来：`.template-hashes.json` 里 `.trellis/workflow.md` 的哈希停在 `f44acd1c…`，对应提交 `c019b7a8`（2026-06-18）。此后 `.trellis/workflow.md` 被改过 5 次都没更新哈希，`trellis update` 于是把它当"用户改过的文件"，只提示不覆盖。

**改 workflow.md 时必须同时更新 `.template-hashes.json`，否则下一次又变成"用户改过"。** 而且 `regression.test.ts` 的 dogfood 一致性测试只覆盖 Python 脚本（`.trellis/scripts` ↔ `templates/trellis/scripts`），不覆盖 workflow.md，没有自动网。

技能文件同理，源在 `packages/cli/src/templates/common/skills/`（before-dev / brainstorm / break-loop / check / update-spec），渲染后落到 `.agents/skills/trellis-<name>/SKILL.md`，由 `configurators/dsh.ts` 的 `collectDshTemplates` 写。改源不改渲染产物，或反过来，都会漂移。

---

## 八、怎么保证不烂掉

### 集成测试

新增 `packages/cli/test/scripts/deferred-marker.integration.test.ts`，照 `packages/cli/test/scripts/task-meta.integration.test.ts` 的写法：

1. 把 `packages/cli/src/templates/trellis/scripts` 拷到临时目录；
2. 造几个含标记的文件（好的、缺 `until`/`when` 的、`until=v0.8` 的、引号被切碎的、文档围栏里的假标记、跳过目录里的）；
3. 断言：
   - 好标记能解析出全部字段；
   - 缺条件、格式不符、字段名拼错在 `--strict` 下退出码为 1；
   - 已到期的在 `--expired` 下退出码为 1；
   - 预发布版不误报；
   - 围栏内和跳过目录里的标记不被收集；
   - `add` 子命令产出的行能立刻被解析器接受。

### 仓库级回归断言

在 `packages/cli/test/regression.test.ts` 加一条：对真实仓库跑 `--strict` 必须退出 0。将来有人写了残缺标记，CI 立刻红。

---

## 九、先拿三条现成欠账试水

| 位置 | 要补的信息 |
| --- | --- |
| `packages/cli/src/cli/index.ts:83` | `until` 填下次删 `--devin` 旧别名的版本；`verify`：`trellis init --windsurf` 后 `.devin/` 仍正确生成 |
| `packages/cli/src/commands/update.ts:116` | `when`：不再支持从 v0.5.0-beta.17 及更早版本升级；`verify`：`trellis update` 对旧安装仍识别为 Trellis 管理块 |
| `packages/cli/src/commands/update.ts:658` | `when`：Codex 旧布局（`.agents/skills/` 被跟踪、无 `.codex/`）不再有真实用户；`verify`：`trellis update` 在旧布局 fixture 上仍生成 `.codex/` |

---

## 十、明确不做

- **不建中心台账文件。** 台账与代码分家必然失同步。
- **不加配置开关。** 五个字段就是全部规则。
- **不做自动删除。** 脚本只报告，删不删由人决定。
- **不做数量基线。** 欠账多不是错误，`--strict` 只查格式。
- **不替代 spec。** spec 记"该怎么做"，标记记"这里故意还没做"。
- **不自动延长 `until`。** 改期必须写进提交信息，说明为什么延。

---

## 十一、收益与代价（诚实版）

### 收益

1. 后来者面对旧代码从"猜"变成"读"，省掉每次的考古时间。
2. "永远留着"变成"有条件地留着"，欠账有了明确的重新进入点。
3. AI 遇到旧代码时有了确定的动作，不再在"冒险删"和"永久绕开"之间摇摆。
4. 发版前有一个机器能判的关卡，而不是靠人记得。

### 代价

1. 多一个脚本，受双树逐字节一致约束（`regression.test.ts` 已自动覆盖新文件）。
2. 写标记时要动脑填字段，尤其 `until` / `when`。
3. 只有 `when` 的标记脚本判不了，只能列给人看，需要人真的去看。

### 最大风险

Agent 为了省事，把"该删的没删"包装成一条标记交差。防线是那条硬规则：写不出 `until` 也写不出 `when`，就必须当场删。

### 消不掉的缺口

第四章四层能保证**写下来的标记格式一定对**，保证不了**该写的标记一定被写**。`after_archive` 钩子只能查"你改过的文件里有没有旧标记过期了"，查不出"你这次偷偷留下的旧代码"。这个缺口只能靠收尾清单那条问句，而它依赖 AI 自觉。

---

## 十二、待定项

| # | 问题 | 倾向 |
| --- | --- | --- |
| 1 | 关键字用 `trellis-defer` 还是别的 | `trellis-defer` |
| 2 | `owner` 填包键还是填人名 | 包键。人会走，模块不会 |
| 3 | `workflow.md` 的模板/仓库偏差本次是否对齐 | 已对齐（2026-11-11，两边都是 `eb4508a4…`） |
| 4 | 是否挂 CI（`--strict`） | 建议挂，只查格式 |
| 5 | `--expired` 是否直接进 `release-preflight.js` | 建议进，但先跑一个版本观察 |
| 6 | `add` 子命令要不要同时支持"整文件扫描后批量补" | 暂不支持，先只为单点插入 |
