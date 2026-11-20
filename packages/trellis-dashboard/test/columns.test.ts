import { describe, expect, it } from "vitest";

import { partitionTaskCards } from "../src/columns.js";

const CARD = { title: "x", description: "y" };

describe("partitionTaskCards", () => {
  it("splits planning and in-progress cards without changing their order", () => {
    const columns = partitionTaskCards([
      { ...CARD, status: "planning", key: "a" },
      { ...CARD, status: "in_progress", key: "b" },
      { ...CARD, status: "brainstorm", key: "c" },
      { ...CARD, status: "in-progress", key: "d" },
    ]);

    expect(columns.planning.map((card) => card.key)).toEqual(["a", "c"]);
    expect(columns.inProgress.map((card) => card.key)).toEqual(["b", "d"]);
  });

  it("leaves other statuses out of both columns instead of misfiling them", () => {
    const columns = partitionTaskCards([
      { ...CARD, status: "completed", key: "done" },
      { ...CARD, status: "unknown", key: "odd" },
      { ...CARD, status: "Planning", key: "cased" },
    ]);

    expect(columns.planning).toEqual([]);
    expect(columns.inProgress).toEqual([]);
  });

  it("returns two empty columns for an empty index", () => {
    expect(partitionTaskCards([])).toEqual({ planning: [], inProgress: [] });
  });
});
