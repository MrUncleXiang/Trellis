# 旧基线同环境回归复核（中途报告 2）

## 结论摘要

当前最终全量测试 `full-final-current.txt` 有 18 项失败。已对全部 18 项中的 17 项做了固定旧基线 `9b76fe49f19de4d383dd4677fea803e2f2da7004` 的同环境对照复现。

- 17 项在旧基线与当前版本表现一致（同为失败，或属于同一测试内的相同断言）。
- 1 项（`omp command frontmatter`）在当前版本失败、在旧基线通过，是与 A 改动相关的回归，需要主会话处理。
- 没有任何一项被“猜测”归因；每一项都有两边运行日志、退出码和文件 SHA 证据。
- 未覆盖：`full-final-current.txt` 中同一测试内因前置失败而被跳过的其余断言，以及需要交互/网络/权限的测试没有单独构造。

## 复现环境（两版本完全一致）

- 旧基线隔离克隆：`C:\Users\PXWD\AppData\Local\Temp\trellis-baseline-review\Trellis2`
- 旧基线根提交：`9b76fe49f19de4d383dd4677fea803e2f2da7004`
- marketplace（市场模板子模块）：`f503b7869953ebe81ee98bff3258d9dbc19b42a2`
- 当前版本工作区：`C:\Users\PXWD\.codex\worktrees\planning-artifact-gate\Trellis`，HEAD 也是 `9b76fe49f19de4d383dd4677fea803e2f2da7004`（A 改动都在工作区未提交）
- 依赖安装：`pnpm install --offline --frozen-lockfile --ignore-scripts`，旧基线输出 `reused 249`、`downloaded 0`。
- `PATH` 前插 `%TEMP%\trellis-planning-python-alias`（提供 `python3` 别名），`PYTHONUTF8=1`。
- 运行参数统一：`--maxWorkers=2 --testTimeout=60000`
- Node：`v22.23.2`，pnpm：`10.32.1`，vitest：`4.0.18`，Python 别名指向 `3.13.2`。

## 分组复现结果

### 组 1：回归测试中的 Windows 换行/转义假设（5 项）

命令（两边相同）：

```text
node ./node_modules/vitest/vitest.mjs run test/regression.test.ts -t 'env-file-dedup|strip-breadcrumb' --maxWorkers=2 --testTimeout=60000
```

| 版本 | 结果 | 退出码 | 证据 |
| --- | --- | ---: | --- |
| 当前 | 5 failed / 1 passed / 508 skipped | 1 | `baseline-priority-current.txt` |
| 旧基线 | 5 failed / 1 passed / 507 skipped | 1 | `baseline-priority-old.txt` |

失败项两边完全一致：

1. `[env-file-dedup] repeated SessionStarts with the same key append exactly once`
2. `[env-file-dedup] a changed key appends again`
3. `[env-file-dedup] switching back to an earlier key re-appends (last line wins, not 'appears anywhere')`
4. `[env-file-dedup] a non-UTF-8 user env file does not break SessionStart`
5. `[strip-breadcrumb] _strip_breadcrumb_tag_blocks only strips matched STATUS pairs (backreference parity with parser)`

归因：

- 前 4 项：`session-start.py` 写入的 `export TRELLIS_CONTEXT_ID=...` 行带 Windows 默认的 `\r\n`，而测试期望不带 `\r`。属于测试的换行断言不兼容，与 A 无关。
- 第 5 项：测试构造的字符串里是字面量 `\n`，在 Windows 下按字面量处理，正则未命中，输入原样保留。属于测试的转义/换行假设问题，与 A 无关。

### 组 2：其余 12 项（旧基线同样失败）

命令（两边相同）：

```text
node ./node_modules/vitest/vitest.mjs run test/commands/upgrade.test.ts test/configurators/python-rewrite-parity.test.ts test/scripts/context-injection-limits.integration.test.ts test/templates/omp.test.ts test/templates/opencode.test.ts test/utils/atomic-write.test.ts --maxWorkers=2 --testTimeout=60000
```

| 版本 | 结果 | 退出码 | 证据 |
| --- | --- | ---: | --- |
| 当前 | 6 failed / 0 passed（13 failed / 137 passed / 1 skipped） | 1 | `baseline-other-current.txt` |
| 旧基线 | 5 failed / 1 passed（12 failed / 138 passed / 1 skipped） | 1 | `baseline-other-old.txt` |

旧基线同样失败的 12 项：

1. `upgrade command > executes npm install for real upgrades` — 测试期望直接调 `npm`，Windows 实际调 `cmd.exe /d /s /c "npm install -g ..."`。Windows 宿主行为差异。
2. `upgrade command > fails when npm exits non-zero` — 提示文本用 `where trellis`（Windows），测试正则要求 `which trellis`。Windows 宿主行为差异。
3. `python-rewrite-parity > leaves the literal alone under the default (POSIX) rendering` — `snow: .snow/SNOW.md` 缺少 `python3 ./.trellis/scripts/task.py` 字面量。旧基线同样缺失，是既有模板/测试不一致。
4/5. `context-injection-limits > truncate_utf8 > leaves data untouched when data is at or under the cap` / `never splits a multi-byte UTF-8 sequence at the boundary` — 子进程 stdout 带回 `\r`，测试期望 `\n` 分割结果。Windows 换行。
6/7. `per-file and per-artifact caps > under-cap content is byte-identical to unlimited output (golden)` / `does not misclassify legitimate multi-byte UTF-8 content as binary` — 同样由 `\r\n` 与 `\n` 期望不一致引起。
8. `per-file and per-artifact caps > degrades to an index line once the total budget is exhausted (3 files)` — `big.txt` 内容带 `\r`，期望字符串不含 `\r`。Windows 换行。
9. `per-file and per-artifact caps > max_total_bytes: 0 restores fully unlimited inlining` — 同上，CRLF 内容与 LF 期望不一致。
10. `jsonl file reference containment (#580) > still reads a legitimate jsonl reference inside base_path (control)` — 输出为 `=== inside.md ===\r\nnot secret\r\n`，期望 `=== inside.md ===\nnot secret`。Windows 换行。
11. `opencode context injection limits (issue #441) > directory entries respect the per-file cap and only inline .md files` — 截断提示里路径使用 `refdir\a.md`（反斜杠），测试期望 `refdir/a.md`。Windows 路径分隔符。
12. `writeFileAtomic > preserves the original file when the write fails` — Windows 上 `chmod 0o500` 不阻止写入，测试依赖 POSIX（可移植操作系统接口）权限语义。

### 组 3：A 相关回归（1 项）

`omp command frontmatter > collectOmpTemplates produces commands with YAML frontmatter`

- 当前：失败（`baseline-other-current.txt`）
- 旧基线：通过（`baseline-other-old.txt` 中该测试不在失败列表，旧基线为 12 项失败）
- 失败原因：`continue` 命令渲染结果保留了 YAML frontmatter 之后的 H1 标题，测试要求去除。
- 判定：这是 A 改动引起的回归，需要主会话修复；不能算旧问题。

## 与 full-final-current.txt 的对应关系

`full-final-current.txt`：7 文件失败，78 通过，1 跳过；18 failed，1936 passed，35 skipped，共 1989 项。

- 组 1 覆盖 5 项（全部旧基线同失败）。
- 组 2 覆盖 12 项（全部旧基线同失败）。
- 组 3 覆盖 1 项（A 回归）。

## 未覆盖范围（不能算已证实）

- 组 1 中每组前置失败之后被跳过的断言，未单独运行验证。
- 需要真实网络、真实交互式终端、真实管理员权限、真实 npm 全局安装的路径未单独构造。
- `full-final-current.txt` 中失败文件内被前置失败或 `skipped` 标记掩盖的用例，未逐条展开。
- 旧基线 `regression.test.ts` 收集到 513 项，当前 514 项，差异来自 A 新增测试；两组 `-t` 过滤下不影响本报告结论。
