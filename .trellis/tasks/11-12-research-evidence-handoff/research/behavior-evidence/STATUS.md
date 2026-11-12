# 行为演练状态

最终报告：`../scenario-validation-results.md`

- 首轮与新版复验证据在 `runs/`、`runs-current/`、`ac4-revalidation/`、`task-artifacts/`、`task-artifacts-current/`。
- AC1 首轮/第二次运行的中断事实和 AC4 首轮失败均保留在报告中。
- AC4 新版复验：退出码 0，`turn.completed=true`，先写 `research/revalidation.md` 再更新 PRD。
- X1/X2/X8/X10/X11 由主代理验证，链接见报告；本目录不伪称这些场景由本检查代理重跑。

- AC1 最新版完整会话重验：退出 0、turn.completed=true，研究文件先于 PRD/最终结论；证据 `ac1-revalidation/`，先前两次中断保留。
