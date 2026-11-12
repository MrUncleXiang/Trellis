# B：调研依据保存与交接

## 本任务归属与当前状态

父任务：[完善任务材料的可靠性与可追溯性](../11-12-task-artifact-reliability/prd.md)。本任务由 [原入口 A](../11-11-planning-artifact-gate/prd.md) 中的 B 节拆出，完整保留补全草案、历史统计、需求编号和验收场景。

2026-11-12 用户批准建立父子任务和迁移材料，未批准 B 开始实施。任务处于规划状态；既有“仅修改指导文字、不新增脚本门禁”的取舍是当前基线，外部调查引出的自动辅助路线尚未定案。

## 当前讨论入口

- 用户结果：影响任务决定的证据能够及时保存，并被下一位接手者找到和理解。
- 已有草案覆盖记录触发、最低内容、来源、未知、引用和验收；详见下方 B1 至 B7。
- 下一步优先讨论：第一版是否仅依靠规划技能，还是允许加入自动提醒或来源线索捕获；这些机制各自要保证什么、允许什么漏记或噪声。自动辅助不等于来源和结论的质量门禁。
- 可复用调查：[GitHub（代码托管平台）上的调研保存与接手方案](research/github-research-persistence.md)。其项目比较是方案证据，未授权安装、增加依赖或扩大实现范围。

## 后续规划需对齐的位置

上一轮核对发现，总流程模板 `packages/cli/src/templates/trellis/workflow.md` 的 1.5 完成条件仍将复杂任务调研文件列为建议。确定 B 的最终规则后，除规划技能源文件外，还需核对该完成条件及平台生成产物是否一致，避免技能说必须、总流程又说建议。此处记录已发现的协调点，不提前确定最终实现机制。

本子任务只拥有 B 的详细需求与验收。A、C 的要求在各自子任务维护；共同文件与整体检查见父任务。

---

# B. Outside evidence is researched but never written down

**状态（2026-11-12）：需求补全草案，待用户审阅。** 保留 2026-11-11 的既定取舍：不强迫每个任务开展外部调研，文件命名自由，通过指导文字落实，不新增脚本门禁。以下新增细节不表示用户已经确认或授权实施；历史统计保留原测量日期。

## 目标与问题边界

凡是任务决策依赖外部证据，接手者应能从任务材料找到：查了什么、依据是什么、结论是什么、影响了什么决定、还有什么不知道。无需回看原聊天，也无需为找回已有依据重新调查。

约束对象是决策依据的保存和可发现性，不是浏览次数、报告篇幅或文件数量。保存不等于证明结论正确，文字指导也不等于保证人工智能一定遵守。

## Measurements (2026-11-11)

Two rounds of measurement. The first counted where research content ended up; the second tested whether the downstream reader works at all.

**The sample.** Of 231 archived tasks, **30** have a `prd.md` matching this exact case-insensitive set — `web search|联网|调查|调研|第三方库|现有方案|industry`. That set is the entire definition; a different one gives a different sample. For scale: 77 PRDs match the bare word `research` (case-insensitive; case-sensitive it is 74), and 86 match either definition (84 case-sensitive), so this 30 is a deliberately narrow slice of tasks that *announced* they were going to look outside the repository, not every task that did.

Each task is placed in the first bucket that applies, in this order — the order matters, because the buckets overlap:

| Home | Definition | Count | Share |
|---|---|---|---|
| `research/` directory | a `research/` directory exists in the task | 9 | 30% |
| Another `.md` in the task root | some `.md` other than `prd.md` / `design.md` / `implement.md` (e.g. `research-readme-patterns.md`) | 5 | 17% |
| A research section inline in `prd.md` | no directory, but some `##` heading contains the word `research` (case-insensitive) | 3 | 10% |
| Neither | no directory, no extra `.md`, no `##` research heading — the evidence, if any, is prose in the PRD body | 13 | 43% |

(Corrected after review: the earlier table labelled the last bucket "only a one-sentence conclusion", which is not what the classifier tests, and never stated the heading rule for the third bucket. A looser rule — any heading level, or headings matching `调研`/`研究` — moves tasks between buckets 3 and 4, so the rule is written down here rather than assumed.)

Of those 13, **7 contain at least one external URL** and 6 contain none at all. Where a URL survives, "where I looked" survives too — but "what I found and what I ruled out" usually does not. A second classifier (a PRD counts as carrying real research if it holds at least one URL or eight or more table rows) splits the same 13 into **8 that do carry research inline** — 7 via a URL, plus `01-20-product-positioning-kleinhe` with a 57-row comparison table and no URL — and **5 that carry nothing at all**: `01-21-doc-collaboration-research-kleinhe`, `02-05-improve-brainstorm-flow`, `04-17-hook-path-robustness`, `05-01-fix-opencode-trellis-research-persist`, `05-06-fix-python-pre-3-12-fstring-backslash-crash-in-session-start-hooks`. (Corrected after review: the earlier "7 carry / 6 nothing" split, and its list of six names, was wrong — it mixed this classifier with the bucket-3 definition and named two tasks that are not in this bucket at all.)

**Downstream reader — a route exists; delivery is conditional.** Of the 43 archived tasks with a `research/` directory:
- **31 cite a `research/` path** in `prd.md`, `design.md`, or `implement.md`; 12 do not. (Corrected after review: the earlier "36 cite / only 7 do not" counted tasks containing the *word* research, not tasks citing a research *path*.)
- Of the 40 that carry an `implement.jsonl`, 39 contain the word `research`, but in **15 of those it appears only in the `_example` placeholder row** — **24 tasks** actually curate a research entry. (Corrected after review: the earlier draft's withdrawn "24" was the true value all along.)

读取渠道存在，但不等于资料一定送达：`packages/cli/src/templates/common/skills/before-dev.md:5-18` 要求读取任务材料，并按其中引用的规范和调研路径识别相关材料；`packages/cli/src/templates/trellis/workflow.md:402-412` 要求为实施和检查分别选择需要的调研上下文。文件仅存在于 `research/`，不能据此断言接手者已经读到。`check.md` 本身没有单独的调研读取要求。

By archive month: 2026-01 through 2026-03 hold zero `research/` directories (0/34, 0/14, 0/37 — the convention arrived in 2026-04), then 10/35 (28.6%), 13/45 (28.9%), 18/49 (36.7%), 1/15 (6.7%), 1/2 (50%). (Corrected after review: "never exceeded 37%" was false — one month reaches 50%. Grouped by the month in the task's own name prefix instead, 2026-06 is 9/17 = 52.9%.)

## 证据边界与共同根因

上述“有网址”“有目录”“有八行表格”等统计只是筛查线索，不能证明资料准确、足够或已被阅读；未命中也不能证明完全没有调研。不用这些比例直接计算调研丢失率，或证明新增规则有效。

可核实的流程缺口是：总流程已有保存要求，正在使用的规划技能没有连接“判断调查需要 → 保存结果 → 在任务材料引用 → 规划收敛前复查”。正确落点是规划技能，不是新增扫描器或另建上下文系统。

- `packages/cli/src/templates/trellis/workflow.md:363-390` 已覆盖主会话和子代理的调研保存；不能再归因于“主会话模式读不到规则”。
- `packages/cli/src/templates/common/skills/brainstorm.md:11-19` 要求先查仓库；`:42-50` 识别证据但未要求保存外部发现；`:131` 要求处理技术未知；`:165` 说明上下文清单；`:182-195` 没有复查调查记录与引用。这是可观察的指导缺口；“该缺口导致历史遗漏”是待验证的解释，不是已证明的唯一原因。
- 下游入口存在，但依赖引用和按需选择。只补“创建文件”，仍会留下“文件存在却找不到”的问题。

## 需求

### B1 — 按决策需要触发，不按是否联网触发

在规划以及按现有流程返回规划补充调查时，只要为解决任务问题而查证外部能力、限制、方案或经验，且结果用于支撑或改变需求、方案、兼容性、风险或验收判断，就必须保存调查及其结果。调查没有找到答案时同样适用，见 B5。

“外部”指任务自身代码和项目既有规范之外的证据，包括在线资料、本地第三方依赖源码或文档、用户提供的参考资料，以及针对外部行为所做的实验；放在本机不改变其性质。普通的项目代码定位、既有规范阅读仍遵循已有仓库证据规则，不要求每次阅读另写报告。已有依据足够时可复用，无需重复搜索。

无关浏览、未参与判断的搜索命中和重复页面不要求逐条登记；一旦用来支持或否定决定，就不能只留在聊天里。

### B2 — 及时保存有用发现，内容随问题大小变化

取得关键发现、排除方案或确认未知后，及时更新任务的 `research/<topic>.md`，最迟在基于该发现提出规划结论前落盘，不等会话结束后凭记忆补写。文件命名和组织自由，同一主题可持续更新，不要求每次查询新建文件。

每个被采用的调查结论至少保留：要回答的问题、可定位的来源、结论及适用限制、对任务决定的影响。实际比较并排除了方案时，记录原因；没有备选方案时不制造“排除项”。一小段文字也可满足要求，不要求浏览流水账或复制整篇原文。

### B3 — 来源可追溯，事实与推断分开

对支撑决策的关键事实附足以复查的来源，不要求每句话附网址，不把“存在网址”当成证据充分。

- 网页：链接和支撑结论的章节或条目；依赖版本或时效时注明相关版本或查阅日期。
- 本地第三方资料：路径或稳定标识、版本及相关位置，不能只写换机器就失效的绝对路径。
- 用户资料：名称或标识及相关位置；只在会话中时保存必要摘录或摘要并标明“用户提供”，不宣称已独立核实。
- 实验：关键环境或版本、操作条件、可复查的步骤或命令及观察结果；不要求保存所有日志。

根据来源得出的解释应标为推断；无法核实的内容标为未知或假设，不能靠附链接伪装成事实。来源冲突时保留冲突、当前选择及理由，不能静默择取支持既定方案的一方。

### B4 — 明确调研状态，不制造空产物

在 `prd.md` 的 `## Research` 下简短说明当前状态，并引用实际使用的记录；同一任务可同时有已知结论和未解决问题，不强迫只选一种状态。

- 不需要外部调研：一句话解释与本任务有关的原因；不创建空 `research/` 或“不需要调研”文件。
- 已有可复用依据：说明为什么适用并引用记录，核对会影响当前决定的版本或前提；无需机械新建副本。
- 已开展调查：列出关键结论和记录路径；仍有未知时按 B5 说明。

“尚未调查”“查过但没找到可靠答案”“没有必要调查”不能混为一谈。调查需要变化时更新状态，不能把它当成只填写一次的勾选项。

### B5 — 无结果、冲突和后续变化也有处理

未得到可靠答案时，记录查了哪些相关来源、哪些结论仍不能成立、未知对方案的影响，以及下一步处理方式。不能由“未找到”推断“该能力不存在”。

未知会改变用户需要决定的范围、行为、兼容性或风险时，继续规划并呈现待决定项，不宣称规划就绪。已有证据足以确定未知不影响当前约定结果时，可说明理由并按现有流程延后，不另建开工门禁。

新证据推翻旧结论时，更新当前记录、受影响的规划决定及引用，说明哪个结论已被替代，避免接手者把冲突版本都当成有效方案；无需另建完整历史账本。

### B6 — 建立接手入口，按需进入既有上下文渠道

每个影响当前决定的调查主题，应在 `prd.md` 的 `## Research` 保留关键结论和记录链接；决定写在 `design.md` 等其他任务材料时，决定附近也引用同一记录，不复制整份调研内容。

任务内新记录优先使用相对任务目录的路径；复用其他位置的记录时写清位置，保证从当前任务可定位。路径不能只留在聊天中。现有子代理流程按需要将记录选入 `implement.jsonl` 或 `check.jsonl`，不要求每份调查注入所有代理，不改变清单格式和选择规则。

### B7 — 以结果复查完成情况

宣布规划就绪前，核对：状态明确；影响决策的证据已保存或有可用复用来源；引用可定位；事实、推断和未知可区分；影响约定结果的未知已有处理决定。不能只检查“有文件”“有链接”“目录非空”。

这是规划技能中的人工智能自查和审阅要求，不新增命令、自动评分、脚本拒绝条件或任务字段。规则是否改善行为，需通过下列场景演练判断，不能只凭文字出现就宣称有效。

## 已保留的取舍与落地边界

2026-11-11 已确认的不强迫调研、命名自由、无新增脚本门禁或字段、不回填历史任务，继续保留。

后续实施的主要落点仍是 `packages/cli/src/templates/common/skills/brainstorm.md`，在四个既有位置覆盖本节需求，而非限制为“四行修改”：证据规则之后说明保存、来源与接手要求；规划过程区分仓库证据、外部证据和待调查问题；规划收敛检查核对记录、引用和未知；最终质量检查核对完成条件。原“每个事实附网址”由 B3 取代，原“写下就能送达”由 B6 的条件化要求取代。

平台产物遵循现有模板生成路径，并验证实际使用的规划技能包含这些规则，不逐份手改生成副本。现有流程已提供保存和读取渠道，无需另改读取代码。本节不要求现在修改技能或启动实施。

## 不做什么

- 不要求每个任务联网、调查第三方方案，或为留记录重复调查。
- 不新增扫描器、自动评分、命令、脚本门禁或字段；不修改上下文清单的格式和选择规则。
- 不回填 231 个历史任务，不把统计筛查条件变成产品规则。
- 不强制调研文件名、章节顺序、篇幅或模板，不制造空目录和空记录。
- 不扩展成完整文献库、永久来源镜像、历史账本或组织级经验库。
- 不宣称记录能够证明结论正确，或指导文字能够保证遵守。

## 验收场景

这些是人工审阅和会话场景验收，不要求新增自动扫描器。应在正常主会话和既有子代理交接路径分别确认规则可达，不因验收本身强迫派发无关子代理。

| 编号 | 场景 | 应观察到的结果 | 对应需求 |
|---|---|---|---|
| B-AC1 | 读取外部资料后据此选择或拒绝方案 | 提出结论前已有问题、来源、结论、适用限制和决策影响的记录；实际排除项有理由；不只是贴链接 | B1、B2、B3 |
| B-AC2 | 改一条提示语，既有项目材料足够判断 | 一句话说明无需外部调研；无额外搜索、空目录或空文件 | B1、B4 |
| B-AC3 | 未联网，读本地第三方依赖后发现版本限制 | 记录依赖标识、版本、相关位置及对方案的影响，不因没有网址漏记 | B1、B3 |
| B-AC4 | 查过但没有可靠答案，或来源冲突 | 记录范围、未知或冲突及影响；不写成“不需要调研”或“能力不存在”；影响约定结果时不宣称规划就绪 | B3、B4、B5、B7 |
| B-AC5 | 新会话只有任务入口，没有原聊天 | 从需求文档找到关键结论与引用，区分事实、推断、未知；按既有模式找到实施或检查需要的资料 | B3、B6、B7 |
| B-AC6 | 已有历史调查适用 | 引用并说明前提；不重复搜索、不复制整份报告；关键前提失效时补查更新 | B1、B4、B5、B6 |
| B-AC7 | 实验或用户资料是关键依据 | 能定位资料或复查实验条件、步骤、观察；推断另行标注，不伪称独立核实 | B3 |
| B-AC8 | 新证据推翻旧结论，或后来出现调查需要 | 更新状态、记录、受影响的规划决定及引用，接手者能辨认当前结论 | B4、B5、B6 |
| B-AC9 | 无关浏览未被任何决定采用 | 不逐条登记；后续一旦用于支持或否定决定，就补足依据 | B1、B2 |
| B-AC10 | 宣布规划就绪并检查生成后的技能入口 | 除规则可达外，按上述场景核对记录、来源、引用和未知处理；没有新增脚本门禁 | B7 |

## 本轮补全依据与审阅状态

需求补全阶段只核对本仓库的原需求、规划技能、开发前指导、检查技能及总流程；历史统计保留 2026-11-11 口径，未在该阶段逐项重测。

2026-11-12 按用户要求追加外部方案调查，见 [GitHub 上的调研保存与接手方案](research/github-research-persistence.md)。已核对三个项目的固定提交源码，分别比较提示词、自动提醒、自动捕获和程序拦截。结论：这些机制的保证范围不同，不能把自动触发脚本等同于调研质量门禁；尚未决定改变 B 的实施范围。

四个讨论缺口都有落点：触发见 B1，来源见 B3，接手入口见 B6，结果验收见 B7 和验收表。新增细节是本轮草案，待用户审阅；A、C 的需求及实施授权不受影响。

---

