# Resolve conflicting SSR evidence

## Background

We need to know whether local-chart 1.2 supports SSR for the new renderer. Two fixed local snapshots disagree. Also determine whether the documented request rate limit is known well enough to promise throughput.

## Research

已完成限定范围内的固定资料复核，记录见 [复核依据与边界](research/revalidation.md)。仅使用 fixtures/docs 下三份用户提供的固定快照，未联网或验证实际软件包。服务端渲染证据冲突：较新的发行说明明确称从 1.2 移除，暂按不支持处理，但未独立确认；请求速率上限未知，不能承诺吞吐量。冲突和缺少数值证据仍影响能力与容量承诺；当前不据此进入实现。

