import { describe, expect, it } from "vitest";

import { getTaskStatusPresentation } from "../src/client/status-presentation.js";

describe("getTaskStatusPresentation", () => {
  it("maps known Trellis statuses to readable labels and card tones", () => {
    expect(getTaskStatusPresentation("planning", false))
      .toEqual({ tone: "planning", label: "规划中" });
    expect(getTaskStatusPresentation("brainstorm", false))
      .toEqual({ tone: "planning", label: "规划中" });
    expect(getTaskStatusPresentation("in_progress", false))
      .toEqual({ tone: "in-progress", label: "进行中" });
    expect(getTaskStatusPresentation("review", false))
      .toEqual({ tone: "review", label: "评审中" });
    expect(getTaskStatusPresentation("completed", false))
      .toEqual({ tone: "completed", label: "已完成" });
  });

  it("keeps unknown status text and gives archived cards their own tone", () => {
    expect(getTaskStatusPresentation("blocked", false))
      .toEqual({ tone: "unknown", label: "blocked" });
    expect(getTaskStatusPresentation("completed", true))
      .toEqual({ tone: "archived", label: "已完成" });
  });
});
