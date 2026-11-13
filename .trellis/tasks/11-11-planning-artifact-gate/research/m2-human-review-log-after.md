# Previous round: synthetic fixture setup

The local-storage version cccccccccccccccccccccccccccccccc and its approval record were seeded test data, not a real human reply.
{
  "other": {
    "keep": true
  },
  "planningAttest": {
    "schemaVersion": 1,
    "reviewId": "cccccccccccccccccccccccccccccccc",
    "attestedAt": "2026-11-12T12:00:00+00:00",
    "note": "Fixture planning version under review",
    "reviewFiles": {
      "prd.md": "1f4e6e9f8c773fcf9555f35d6ecd5a2a76424b032ef65c1010058d9f2814c6e0",
      "design.md": "aa27bcbd0a760d0fed7f2ee25b134e1d8654a0f7148f734d465033fb83699c50",
      "implement.md": "ab958ce49cb4a1b6ec4238c4d15597f8673d8c477e9c37f964ce09d3ff284502"
    },
    "files": {
      "prd.md": "1f4e6e9f8c773fcf9555f35d6ecd5a2a76424b032ef65c1010058d9f2814c6e0",
      "design.md": "aa27bcbd0a760d0fed7f2ee25b134e1d8654a0f7148f734d465033fb83699c50",
      "implement.md": "ab958ce49cb4a1b6ec4238c4d15597f8673d8c477e9c37f964ce09d3ff284502"
    },
    "editorialChanges": []
  },
  "planningApproval": {
    "schemaVersion": 1,
    "reviewId": "cccccccccccccccccccccccccccccccc",
    "reviewedFiles": {
      "prd.md": "1f4e6e9f8c773fcf9555f35d6ecd5a2a76424b032ef65c1010058d9f2814c6e0",
      "design.md": "aa27bcbd0a760d0fed7f2ee25b134e1d8654a0f7148f734d465033fb83699c50",
      "implement.md": "ab958ce49cb4a1b6ec4238c4d15597f8673d8c477e9c37f964ce09d3ff284502"
    },
    "recordedAt": "2026-11-12T12:00:00+00:00",
    "note": "Fixture-only confirmation for this reviewed version; not a real approval",
    "source": "Fixture-only transcript line after the displayed version"
  }
}

# Version B: pending real human reply

{
  "reviewId": "c4eb6574fa664ef3a770c94db22aa5cd",
  "reviewFiles": {
    "prd.md": "02fbae7c957cc80a1b28e95a46a7775f2cc819d5e828ad324a88e5fb64a9e7b9",
    "design.md": "8e3a7d2b65c9597fe3be1d27c835b88f122eec923115edf750c010f776e8db07",
    "implement.md": "bb87e18da5c8ff4b442c012c1ddce3483719cdb4ff4dda6d5f5ce80a5028d43e"
  },
  "summary": "Local-only -> remote-upload description; changed privacy/network risks. Only metadata start is requested; no network operation.",
  "reply": null
}

# 新版本展示后的真实答复（2026-11-13）

{
  "approval": {
    "receivedAndRecordedAt": "2026-11-13T02:55:48.917942+00:00",
    "reviewId": "c4eb6574fa664ef3a770c94db22aa5cd",
    "note": "同意。",
    "source": "本会话：用户在上一条展示完整版本 c4eb6574fa664ef3a770c94db22aa5cd、明确仅登记隔离样例开工与核验的确认问题后，回复“同意。”；无可用消息编号，不编造。展示内容另存于 m2-human-review-summary.md。",
    "scope": "仅隔离样例的版本绑定开工、读回批准/状态/指针/钩子后停止；无上传、不改变 A 产品范围",
    "oldApprovalSynthetic": true,
    "twoRealApprovalRoundsClaimed": false
  },
  "reviewFiles": {
    "prd.md": "02fbae7c957cc80a1b28e95a46a7775f2cc819d5e828ad324a88e5fb64a9e7b9",
    "design.md": "8e3a7d2b65c9597fe3be1d27c835b88f122eec923115edf750c010f776e8db07",
    "implement.md": "bb87e18da5c8ff4b442c012c1ddce3483719cdb4ff4dda6d5f5ce80a5028d43e"
  },
  "change": "样例描述从本机保存改为远程上传，影响数据去向、隐私、凭据及断网处理。仅测试状态命令，不存在上传客户端。",
  "verification": "先拒绝旧版，真实新答复后仅登记新版本开工，读回后停止。"
}
