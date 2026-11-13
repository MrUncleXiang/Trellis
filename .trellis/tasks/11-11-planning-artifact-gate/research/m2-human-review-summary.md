# M2 live reconfirmation: pending

ReviewId: `c4eb6574fa664ef3a770c94db22aa5cd`.

This is an isolated test fixture. Its old local-storage approval is synthetic setup, explicitly recorded before replan; it is not attributed to the user. Version B changes the described solution to remote upload. This affects data location, privacy, network failures and credentials in a real implementation. The exercise itself contains no upload client and only runs Trellis state commands. No real product requirement is changed.

The old reviewId was rejected. Replan and new attest succeeded, validate reports waiting, and the fixture remains planning with no approval. A real user reply to this displayed B version is still required before the fixture can start.

## Reviewed fingerprints

- `prd.md`: `02fbae7c957cc80a1b28e95a46a7775f2cc819d5e828ad324a88e5fb64a9e7b9`
- `design.md`: `8e3a7d2b65c9597fe3be1d27c835b88f122eec923115edf750c010f776e8db07`
- `implement.md`: `bb87e18da5c8ff4b442c012c1ddce3483719cdb4ff4dda6d5f5ce80a5028d43e`

## Approved action if user agrees

Run version-bound start for this exact isolated fixture using the actual user reply and locatable conversation source; read back approval/status and stop. No upload, real storage implementation or product redesign is authorized.


## 待向用户展示的中文版本摘要

待审版本：`c4eb6574fa664ef3a770c94db22aa5cd`。

- 目标：演练“方案实质变化后，旧确认失效，必须展示新版本并取得新答复”。
- 变化：样例文字从“只保存在本机”改成“发送到远程服务”；真实产品里会改变数据去向、隐私、凭据及断网处理，因此属于实质变化。
- 方案与步骤：仅在隔离临时目录登记这份新版本的批准及开工状态，读回确认记录、状态、会话指针与钩子计数，然后停止。不存在上传客户端，不运行上传，不修改真实产品需求。
- 验收：旧版本开工已实际被拒绝；新版本当前仍处于规划状态、没有批准。收到针对本版本的真实答复后，才验证新版本可以开工且记录对应答复和出处。
- 限制：旧版批准是明确标记的合成测试设置；新答复只能证明这一次真人交互，不能证明审批身份不可伪造，也不代表真实远程上传获准。

实际用户答复：尚未收到。提交例外的“接受。”早于本版本展示，不挪用。
