## 提交说明语言

- Git（版本控制）提交说明以中文为主，提交标题中的变更描述及正文使用中文。
- 必要的类型前缀（如 `feat`、`fix`、`docs`）、作用域、文件路径、命令、代码标识符和专有名称可以保留原文。
- 示例：`docs: 补充提交说明语言约束`。

## 个人派生仓库分支约定

- `upstream` 指向原项目，`origin` 指向个人派生仓库；不向 `upstream` 推送。
- `main` 是上游镜像分支，只接收 `upstream/main` 的更新，不合入个人定制内容。本地和远程 `main` 都遵守此约定；若已分叉，先查清原因，不强制覆盖。
- `codex/personal` 是个人长期使用和整合分支，日常使用此版本，向 `origin/codex/personal` 推送。
- 新任务从最新 `codex/personal` 创建 `codex/` 前缀的任务分支；按任务完成规划确认、实施和验证后，合回 `codex/personal`，不合入 `main`。
- 接收上游更新时，先更新镜像 `main`，再将其合入 `codex/personal`；处理冲突、检查个人改动仍保留、完成相关验证后再推送。不得把“上游同步成功”当成“个人版本验证通过”。
- 长期分支采用保留历史的合并方式，不重写已推送的提交；不强制推送、不擅自删除分支或覆盖其他工作区的未完成修改。
- 子模块按主仓库记录的固定提交同步，不自动改为子模块最新主分支；修改引用时核对兼容性及个人远程的可拉取性。

<!-- TRELLIS:START -->
# Trellis Instructions

These instructions are for AI assistants working in this project.

This project is managed by Trellis. The working knowledge you need lives under `.trellis/`:

- `.trellis/workflow.md` — development phases, when to create tasks, skill routing
- `.trellis/spec/` — package- and layer-scoped coding guidelines (read before writing code in a given layer)
- `.trellis/workspace/` — per-developer journals and session traces
- `.trellis/tasks/` — active and archived tasks (PRDs, research, jsonl context)

If a Trellis command is available on your platform (e.g. `/trellis:finish-work`, `/trellis:continue`), prefer it over manual steps. Not every platform exposes every command.

If you're using Codex or another agent-capable tool, additional project-scoped helpers may live in:
- `.agents/skills/` — reusable Trellis skills
- `.codex/agents/` — optional custom subagents

Managed by Trellis. Edits outside this block are preserved; edits inside may be overwritten by a future `trellis update`.

<!-- TRELLIS:END -->

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **Trellis** (14336 symbols, 20870 relationships, 300 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> Index stale? Run `node .gitnexus/run.cjs analyze` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? `npx gitnexus analyze` (npm 11 crash → `npm i -g gitnexus`; #1939).

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows. For regression review, compare against the default branch: `detect_changes({scope: "compare", base_ref: "main"})`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.

## Never Do

- NEVER edit a function, class, or method without first running `impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit changes without running `detect_changes()` to check affected scope.

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/Trellis/context` | Codebase overview, check index freshness |
| `gitnexus://repo/Trellis/clusters` | All functional areas |
| `gitnexus://repo/Trellis/processes` | All execution flows |
| `gitnexus://repo/Trellis/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
