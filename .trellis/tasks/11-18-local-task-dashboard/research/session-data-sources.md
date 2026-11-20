# 会话数据源调研（只用于规划）

本文只记录通用软件接口与虚构样本方案，不包含任何真实项目、会话路径、会话编号、标题或对话内容。

## 已确认的软件事实

- 当前 core（共用基础库）已在 `@mindfoldhq/trellis-core/mem` 公开 `listMemSessions` 和 `searchMemSessions`；`MemSessionInfo` 可提供平台名、会话 ID、标题和会话所属项目目录。
- `mem`（历史会话查询工具）目前提供 Claude、Codex、Devin、Grok、OpenCode、Pi、ZCode 的来源分类；当前公开类型中没有 DSH。
- core `mem` 的检索使用对话内容中的多词 AND（同时匹配）文本匹配，不保证语义理解。
- 现有 `mem` 阶段解析器能从会话中的 `task.py create/start` 命令恢复明确任务边界。可将能识别到任务标识的边界作为明确关联证据。
- DSH（AI 助手客户端）提供单会话持久化和会话标题组件；其压缩日志可以用 Zstandard（压缩格式）存储，非压缩日志逐行保存 JSON（结构化文本）。是否要在 `core mem` 公开增加 DSH 来源，须由后续 design review 决定；不预设一定改动 core 发布面。
- 仓库最低 Node.js 版本为 18.17。可用解压实现必须在该最低版本的实际支持范围内，或明确修改功能工具的单独安装要求；不得只在开发者当前机器的新版本 Node.js 上验收。

## 首选数据路径

- 读取所选项目的活动 `task.json` 和必要的任务文档，先从状态、标题和简介生成只读卡片。
- 用项目路径筛选各本地会话来源，减少跨项目匹配；不能只凭“在本机找到的文件”判断它属于用户选定项目。
- 先提取会话元数据，再按任务 ID/任务路径的精确历史证据分类；其次才按任务名称、简介和 PRD 内容搜索，搜索命中只能标「可能相关」。
- DSH 解码和解析逻辑隔离在独立读取适配器；用固定的短日志夹具覆盖压缩、非压缩、截断、非法 JSON、未知格式及无标题会话。只有归属于显式选定项目的文件才进入检索。
- 读取失败应回传有区分度的状态，不能在 UI 中假装「没有匹配会话」。

## 未解决的技术检查

- DSH 项目目录归属标识如何与不同操作系统的真实项目路径一致对应。
- Zstandard 解码依赖是否兼容仓库最低 Node.js 版本和 Windows/macOS/Linux，是否引入 native binary（原生二进制），许可证和安装体积如何。
- `core mem` 已有的文本清洗和上下文规则能否安全复用于只返回会话索引的本机页面；搜索摘录不得暴露给 API/UI。

These checks were part of the earlier session-linking proposal. They are not
requirements for the current task-only dashboard.
# Historical research (deferred)

This note records an earlier exploration of assistant-session sources. Session
matching is excluded from the current task canvas and none of these readers are
part of the dashboard runtime.
