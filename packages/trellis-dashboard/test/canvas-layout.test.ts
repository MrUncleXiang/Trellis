import { describe, expect, it } from "vitest";

import { buildCanvasLayout } from "../src/client/canvas-layout.js";
import type { CanvasTaskCard } from "../src/types.js";

const TASKS: CanvasTaskCard[] = [
  { key: "planning-a", taskId: "a", title: "A", description: "A task", status: "planning",
    priority: "P2", assignee: "", createdAt: "", completedAt: null, package: null, scope: null,
    hasParent: false, childCount: 1, isArchived: false, parentKey: null, childKeys: ["working-a"] },
  { key: "planning-b", taskId: "b", title: "B", description: "B task", status: "planning",
    priority: "P2", assignee: "", createdAt: "", completedAt: null, package: null, scope: null,
    hasParent: false, childCount: 0, isArchived: false, parentKey: null, childKeys: [] },
  { key: "working-a", taskId: "c", title: "C", description: "C task", status: "in_progress",
    priority: "P2", assignee: "", createdAt: "", completedAt: null, package: null, scope: null,
    hasParent: true, childCount: 0, isArchived: false, parentKey: "planning-a", childKeys: [] },
];

describe("buildCanvasLayout", () => {
  it("shows every task in relationship and independent groups without session nodes", () => {
    const { nodes } = buildCanvasLayout({ tasks: TASKS, selectedTaskKey: null });
    const first = nodes.find((node) => node.id === "task:planning-a");
    const child = nodes.find((node) => node.id === "task:working-a");
    const unrelated = nodes.find((node) => node.id === "task:planning-b");

    expect(nodes.find((node) => node.id === "lane:family:planning-a")?.data.title).toContain("任务关系");
    expect(nodes.find((node) => node.id === "lane:independent")?.data.title).toContain("独立任务");
    expect(child?.position.x).toBeGreaterThan(first?.position.x ?? -1);
    expect(nodes.filter((node) => node.type === "task")).toHaveLength(3);
    expect(unrelated).toBeDefined();
    expect(nodes.map((node) => node.type)).not.toContain("session");
    expect(nodes.map((node) => node.type)).not.toContain("source");
  });

  it("places siblings on separate rows and shows non-planning statuses", () => {
    const parent = TASKS.find((task) => task.key === "planning-a");
    const firstChild = TASKS.find((task) => task.key === "working-a");
    const independent = TASKS.find((task) => task.key === "planning-b");
    if (!parent || !firstChild || !independent) throw new Error("expected task fixtures are missing");
    const tasks: CanvasTaskCard[] = [
      parent,
      firstChild,
      { ...firstChild, key: "working-b", taskId: "d", parentKey: "planning-a" },
      { ...independent, key: "review", taskId: "e", status: "review", parentKey: null },
      { ...independent, key: "done", taskId: "f", status: "completed", parentKey: null },
      { ...independent, key: "unknown", taskId: "g", status: "blocked", parentKey: null },
    ];
    const { nodes } = buildCanvasLayout({ tasks, selectedTaskKey: null });
    const firstSibling = nodes.find((node) => node.id === "task:working-a");
    const secondSibling = nodes.find((node) => node.id === "task:working-b");

    expect(secondSibling?.position.y).toBeGreaterThan(firstSibling?.position.y ?? -1);
    expect(nodes.filter((node) => node.type === "task")).toHaveLength(6);
  });

  it("connects parent and child task cards across status lanes", () => {
    const { edges } = buildCanvasLayout({ tasks: TASKS, selectedTaskKey: null });

    expect(edges).toEqual([expect.objectContaining({
      id: "hierarchy:planning-a:working-a",
      source: "task:planning-a",
      target: "task:working-a",
      label: "子任务",
    })]);
  });

  it("keeps dragged task positions and measured dimensions", () => {
    const { nodes } = buildCanvasLayout({
      tasks: TASKS,
      selectedTaskKey: "planning-a",
      positions: { "task:planning-a": { x: 321, y: 654 } },
      measurements: { "task:planning-a": { width: 248, height: 160 } },
    });
    const task = nodes.find((node) => node.id === "task:planning-a");

    expect(task?.position).toEqual({ x: 321, y: 654 });
    expect(task?.measured).toEqual({ width: 248, height: 160 });
  });

  it("only links tasks currently visible on the canvas", () => {
    const archived = {
      ...TASKS[0],
      key: "completed",
      taskId: "done",
      title: "Done",
      status: "completed",
      isArchived: true,
      childKeys: [],
    };
    const { nodes, edges } = buildCanvasLayout({
      tasks: [...TASKS, archived],
      selectedTaskKey: null,
    });

    expect(nodes.some((node) => node.id === "task:completed")).toBe(true);
    expect(edges.some((edge) => edge.source === "task:completed" || edge.target === "task:completed"))
      .toBe(false);
  });
});
