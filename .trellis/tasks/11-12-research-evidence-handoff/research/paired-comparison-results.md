# 旧版与新版同条件行为对照结果

日期：2026-11-12。任务B。执行前方法见[预定方法](paired-comparison-protocol.md)。

## 结论

已完成13种输入、每版2轮，共26对场景结果、60次独立会话。全部正常结束，没有超时或缺阶段。本组中，两版最终聊天回答均判断正确；实际任务材料关键内容旧版25/26、新版26/26。按本次场景内容要求，并将“先保存依据，再提出结论”时序一并判定，旧版10/26、新版12/26。不能宣称新版已稳定满足该约定，也不能据这两个重复的小样本推导普遍改善率。

最突出缺口是：新版也常在进度消息先说“建议采用”“旧方案失效”或“证据不足”，随后才保存依据。最终有完整文件不抵消这个时序失败。新版研究入口更统一，但这属于记录组织的变化，不能当作结论正确性的证明。

## 同条件核对

- 旧版为提交 cadd557cf05435d17ad821f6dcbfe0c1a35c750e。新版在该基线上只替换B的五份入口和默认工作流；两边运行脚本和其他模板一致，真实生成只差六份规则。[源和生成指纹](paired-evidence/setup.json)。
- 模型同为 gpt-6.1-sol，服务配置相同，推理强度均为低；同一命令行0.154.0、同一机器、同一运行器，四进程上限，第二轮交错顺序反向。每次全新进程，不带原聊天；多阶段只保留各自文件。
- 26对初始任务和业务输入指纹全部一致；对应提示逐字一致，AC6升级资料按同一替换执行，AC9同一追加需求。第二阶段文件由第一阶段自然产生，不能要求两版本的自产文件也相等。[完整性核对](paired-evidence/integrity.json)。
- 原汇总的 globalsUnchanged 为 false，已追根核对：命令行自动追加52个实验目录的信任登记。去掉这52段后，配置文件内容指纹与实验前完全一致；全局指导文件指纹也一致。没有改模型或凭据，未回写用户配置。
- 工具钩子和递归代理关闭；仍加载同一用户级指导及技能。没有验证全部真实宿主、自动提醒覆盖或其他模型。模型随机性和远端版本无法固定。

## 结果口径

“材料关键内容通过”由主会话阅读需求、研究及相关设计、计划，并核对事件中的原文读取和实验执行后判断；要求来源、结论、影响、限制及当前状态无实质冲突。可以集中保存在需求正文，不因没有某个目录或某个标题就说资料丢失。

下表“完整交接约定”指本次预定场景的内容要求加B2保存时序，不是对所有B细则的全量合规评分；例如研究章节的字面标题单独描述，不作为内容评分捷径。该判定同时应用任务B2与预定方法中的时序要求：采用/排除、冲突或未知的决定性判断，最迟须在首次对外提出结论前保存。进度消息也属于对外呈现；仅说明准备核对不算结论。该要求对两版相同，覆盖新增决策依据的16项场景；其余10项是无需调查或只读恢复，时序不适用。多阶段必须两阶段都满足。此口径不是新增生产程序门禁。

| 指标 | 旧版 | 新版 | 解释 |
|---|---:|---:|---|
| 正常结束的独立会话 | 30/30 | 30/30 | 进程结束不能替代语义判断 |
| 最终聊天回答判断正确 | 26/26 | 26/26 | 两版都很强，不能写成旧版无法判断 |
| 最终任务材料关键内容完整且一致 | 25/26 | 26/26 | 旧版一例留下“兼容已确认”的活动需求，与审阅拒绝矛盾 |
| 新增依据在首次提出结论前保存 | 0/16 | 2/16 | 新版仅两轮AC3满足；其他样本最终补齐也仍记时序失败 |
| 完整交接约定 | 10/26（38.46%） | 12/26（46.15%） | 本组观测差为7.69个百分点，不是普遍改善率 |
| 新增依据场景最终有当前Research入口 | 0/16 | 16/16 | 仅描述组织约定；旧版多数正文仍保存了内容，不能混同证据丢失 |

## 各场景对照

| 场景 | 旧版材料内容 | 新版材料内容 | 旧版完整约定 | 新版完整约定 |
|---|---:|---:|---:|---:|
| ac1 | 2/2 | 2/2 | 0/2 | 0/2 |
| ac2 | 2/2 | 2/2 | 2/2 | 2/2 |
| ac3 | 2/2 | 2/2 | 0/2 | 2/2 |
| ac4 | 2/2 | 2/2 | 0/2 | 0/2 |
| ac5-start-planning | 2/2 | 2/2 | 2/2 | 2/2 |
| ac5-start-in_progress | 2/2 | 2/2 | 2/2 | 2/2 |
| ac5-continue-planning | 2/2 | 2/2 | 2/2 | 2/2 |
| ac5-continue-in_progress | 2/2 | 2/2 | 2/2 | 2/2 |
| ac6 | 2/2 | 2/2 | 0/2 | 0/2 |
| ac7 | 2/2 | 2/2 | 0/2 | 0/2 |
| ac8 | 2/2 | 2/2 | 0/2 | 0/2 |
| ac9 | 2/2 | 2/2 | 0/2 | 0/2 |
| ac10 | 1/2 | 2/2 | 0/2 | 0/2 |

## 关键实证

1. AC1两版都能正确推荐文件队列且拒绝零丢失承诺，旧版把来源、代价及未知写在需求正文，新版第二轮同样只用需求文档但在Research中集中组织。不因文件数判内容失败。两版均先在进度消息推荐，再写文件。[新版首轮事件](paired-evidence/runs/ac1-r1-new/phase1/events.jsonl)的item_7先推荐、item_8才保存。
2. AC3新版两轮先完成可复现实验及记录，再建议调用方逐项调用。旧版首轮在item_8已经判断无原生批量，item_11才写研究；第二轮建议逐项封装的item_13也早于item_14的保存。完整约定差异来自真实时序，不来自关键词。
3. AC5四入口/状态组合，两版两轮共16个会话均实际读取研究及vendor/messenger.md，正确给出32+21、按标识对应、保留失败、不重试及幂等未知。任务快照未改；没有观察到新版在本组恢复正确率上的提升。
4. AC6两版都核对1.4、升级后改成16+16+16+5。旧版新建本轮适用性记录，含新推导，未逐字整份复制历史报告；不因多一个文件判失败。新版直接引用更简洁，但两版升级结论均在更新前已发表。[新版第二轮升级事件](paired-evidence/runs/ac6-r2-new/phase2/events.jsonl)：item_8已提出新方案，item_9才保存。
5. AC7两版均真正运行演示脚本，识别固定字符串不能证明图片导入或10MB边界。AC8均同步需求、设计、计划并退回规划，未将候选直接批准；仍有先发判断、后保存的共同缺口。
6. AC9第一阶段两版均不为无关命名资料增加研究流水账；第二阶段采用后均保存来源、格式、影响及未定日期语义，新版另建记录并链接。但采用结论已经出现在保存前的进度消息。
7. [旧版AC10第二轮需求快照](paired-evidence/runs/ac10-r2-old/phase1/task-after.json)仍保留compatibility confirmed；其review.md和最终回答已拒绝就绪，却未让活动需求消除矛盾。新版两轮同步撤回确认，保存缺口与重审门槛；同样未满足先保存时序。

## 每一组判定及可复核材料

[机器可读人工判定](paired-evidence/review.json)保留每组理由、产物指纹、所有对外消息及写入事件编号；下面链接均为真实任务全文快照。

| 样本 | 材料关键内容 | 先保存 | 完整约定 |
|---|---|---|---|
| [ac1-r1-new](paired-evidence/runs/ac1-r1-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac1-r1-old](paired-evidence/runs/ac1-r1-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac1-r2-new](paired-evidence/runs/ac1-r2-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac1-r2-old](paired-evidence/runs/ac1-r2-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac10-r1-new](paired-evidence/runs/ac10-r1-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac10-r1-old](paired-evidence/runs/ac10-r1-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac10-r2-new](paired-evidence/runs/ac10-r2-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac10-r2-old](paired-evidence/runs/ac10-r2-old/phase1/task-after.json) | 失败 | 失败 | 失败 |
| [ac2-r1-new](paired-evidence/runs/ac2-r1-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac2-r1-old](paired-evidence/runs/ac2-r1-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac2-r2-new](paired-evidence/runs/ac2-r2-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac2-r2-old](paired-evidence/runs/ac2-r2-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac3-r1-new](paired-evidence/runs/ac3-r1-new/phase1/task-after.json) | 通过 | 通过 | 通过 |
| [ac3-r1-old](paired-evidence/runs/ac3-r1-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac3-r2-new](paired-evidence/runs/ac3-r2-new/phase1/task-after.json) | 通过 | 通过 | 通过 |
| [ac3-r2-old](paired-evidence/runs/ac3-r2-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac4-r1-new](paired-evidence/runs/ac4-r1-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac4-r1-old](paired-evidence/runs/ac4-r1-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac4-r2-new](paired-evidence/runs/ac4-r2-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac4-r2-old](paired-evidence/runs/ac4-r2-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac5-continue-in_progress-r1-new](paired-evidence/runs/ac5-continue-in_progress-r1-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-continue-in_progress-r1-old](paired-evidence/runs/ac5-continue-in_progress-r1-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-continue-in_progress-r2-new](paired-evidence/runs/ac5-continue-in_progress-r2-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-continue-in_progress-r2-old](paired-evidence/runs/ac5-continue-in_progress-r2-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-continue-planning-r1-new](paired-evidence/runs/ac5-continue-planning-r1-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-continue-planning-r1-old](paired-evidence/runs/ac5-continue-planning-r1-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-continue-planning-r2-new](paired-evidence/runs/ac5-continue-planning-r2-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-continue-planning-r2-old](paired-evidence/runs/ac5-continue-planning-r2-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-in_progress-r1-new](paired-evidence/runs/ac5-start-in_progress-r1-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-in_progress-r1-old](paired-evidence/runs/ac5-start-in_progress-r1-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-in_progress-r2-new](paired-evidence/runs/ac5-start-in_progress-r2-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-in_progress-r2-old](paired-evidence/runs/ac5-start-in_progress-r2-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-planning-r1-new](paired-evidence/runs/ac5-start-planning-r1-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-planning-r1-old](paired-evidence/runs/ac5-start-planning-r1-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-planning-r2-new](paired-evidence/runs/ac5-start-planning-r2-new/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac5-start-planning-r2-old](paired-evidence/runs/ac5-start-planning-r2-old/phase1/task-after.json) | 通过 | 不适用 | 通过 |
| [ac6-r1-new](paired-evidence/runs/ac6-r1-new/phase2/task-after.json) | 通过 | 失败 | 失败 |
| [ac6-r1-old](paired-evidence/runs/ac6-r1-old/phase2/task-after.json) | 通过 | 失败 | 失败 |
| [ac6-r2-new](paired-evidence/runs/ac6-r2-new/phase2/task-after.json) | 通过 | 失败 | 失败 |
| [ac6-r2-old](paired-evidence/runs/ac6-r2-old/phase2/task-after.json) | 通过 | 失败 | 失败 |
| [ac7-r1-new](paired-evidence/runs/ac7-r1-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac7-r1-old](paired-evidence/runs/ac7-r1-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac7-r2-new](paired-evidence/runs/ac7-r2-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac7-r2-old](paired-evidence/runs/ac7-r2-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac8-r1-new](paired-evidence/runs/ac8-r1-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac8-r1-old](paired-evidence/runs/ac8-r1-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac8-r2-new](paired-evidence/runs/ac8-r2-new/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac8-r2-old](paired-evidence/runs/ac8-r2-old/phase1/task-after.json) | 通过 | 失败 | 失败 |
| [ac9-r1-new](paired-evidence/runs/ac9-r1-new/phase2/task-after.json) | 通过 | 失败 | 失败 |
| [ac9-r1-old](paired-evidence/runs/ac9-r1-old/phase2/task-after.json) | 通过 | 失败 | 失败 |
| [ac9-r2-new](paired-evidence/runs/ac9-r2-new/phase2/task-after.json) | 通过 | 失败 | 失败 |
| [ac9-r2-old](paired-evidence/runs/ac9-r2-old/phase2/task-after.json) | 通过 | 失败 | 失败 |

## 自动测试同条件补充

为排除原工作树42个其他任务修改，另导出本次暂存树独立构建/测试，并对旧提交建立独立副本。两边使用同一依赖、Windows和Python3.13.2。初次新版遇到13项python3启动失败（系统商店别名不可用）；给两边同一临时可执行别名后，结果如下，不修改仓库代码绕过。

| 同一测试集 | 旧版 | 新版 |
|---|---:|---:|
| 共有596项 | 577通过、6失败、13跳过 | 578通过、5失败、13跳过 |
| 新增B合同11项 | 旧版没有该文件，不计为失败 | 11通过 |
| 含新增文件合计 | 596项 | 589通过、5失败、13跳过，共607项 |

两版共同的5项失败均为原有Windows场景：4项环境文件换行断言、1项状态提示转义断言；测试名称逐项相同，没有新增回归。旧版另有原生工作流镜像字节不一致，新版通过本次.gitattributes的LF约束消除。该自动检查仅证明模板合同/生成及回归情况，不能替代60次行为对照。

原始证据：[旧版日志](baseline-affected-tests.log)、[新版最初环境失败](staged-affected-tests.log)、[同Python环境新版日志](staged-affected-tests-python-fixed.log)、[隔离构建](staged-build.log)、[隔离规范检查](staged-lint.log)、[隔离类型检查](staged-typecheck.log)。隔离检查不是全绿，不能用含其他任务修复的原工作树全量通过掩盖它。

## 失败保留、局限和交付判断

首次运行器误识别外部工具服务名，全部在模型启动前失败，原日志保留于[首次错误批](paired-evidence-attempt-1/)；修正后全部重建会话。它不计入行为分母，正式60次没有选择性重跑。

本实验是有限受控材料下的指令遵守与文件交接观察，不是联网调查真实性测试，也不是全面角色/平台覆盖；主会话人工评分未盲化，且每种只重复两轮。不能据此宣称“新版必遵守”“普遍提高7.69%”或“所有真实宿主已验证”。

当前可交付的是补齐的规则链路和完整可审阅证据，不能宣称全部B行为目标稳定通过。保存时序是已观察到的行为缺口；本轮不为提高统计结果修改产品或反复换提示重跑。若后续目标提高到强制保证，需要重新讨论程序门禁或自动捕获及授权范围，不能从轻量方案偷渡扩大实现。
