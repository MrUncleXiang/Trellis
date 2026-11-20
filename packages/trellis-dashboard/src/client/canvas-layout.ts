import type { Edge, Node, XYPosition } from "@xyflow/react";

import type { CanvasTaskCard } from "../types.js";

interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  task?: CanvasTaskCard;
  selected?: boolean;
  onSelect?: () => void;
}

interface HierarchyLink {
  parentKey: string;
  childKey: string;
}

export type DashboardNode = Node<CanvasNodeData>;

const CARD_WIDTH = 248;
const COLUMN_STEP = 282;
const ROW_STEP = 180;
const TASK_HEIGHT = 160;
const GROUP_GAP = 38;

interface CanvasLayoutOptions {
  tasks: CanvasTaskCard[];
  selectedTaskKey: string | null;
  positions?: Readonly<Record<string, XYPosition>>;
  measurements?: Readonly<Record<string, { width: number; height: number }>>;
  onSelectTask?: (key: string) => void;
}

function collectHierarchyLinks(tasks: CanvasTaskCard[]): HierarchyLink[] {
  const taskKeys = new Set(tasks.map((task) => task.key));
  const links = new Map<string, HierarchyLink>();
  const addLink = (parentKey: string, childKey: string): void => {
    if (parentKey === childKey || !taskKeys.has(parentKey) || !taskKeys.has(childKey)) return;
    links.set(`${parentKey}\0${childKey}`, { parentKey, childKey });
  };

  for (const task of tasks) {
    if (task.parentKey) addLink(task.parentKey, task.key);
    for (const childKey of task.childKeys) addLink(task.key, childKey);
  }
  return [...links.values()];
}

function groupRelatedTasks(
  tasks: CanvasTaskCard[],
  links: HierarchyLink[],
): { groups: CanvasTaskCard[][]; independent: CanvasTaskCard[] } {
  const taskByKey = new Map(tasks.map((task) => [task.key, task]));
  const neighbors = new Map(tasks.map((task) => [task.key, new Set<string>()]));
  for (const link of links) {
    neighbors.get(link.parentKey)?.add(link.childKey);
    neighbors.get(link.childKey)?.add(link.parentKey);
  }

  const visited = new Set<string>();
  const groups: CanvasTaskCard[][] = [];
  const independent: CanvasTaskCard[] = [];
  for (const task of tasks) {
    const adjacent = neighbors.get(task.key);
    if (!adjacent || adjacent.size === 0) {
      independent.push(task);
      continue;
    }
    if (visited.has(task.key)) continue;

    const group: CanvasTaskCard[] = [];
    const queue = [task.key];
    visited.add(task.key);
    let cursor = 0;
    while (cursor < queue.length) {
      const key = queue[cursor];
      cursor += 1;
      if (!key) continue;
      const member = taskByKey.get(key);
      if (member) group.push(member);
      const currentNeighbors = neighbors.get(key);
      for (const neighborKey of currentNeighbors ?? []) {
        if (!visited.has(neighborKey)) {
          visited.add(neighborKey);
          queue.push(neighborKey);
        }
      }
    }
    groups.push(group);
  }
  return { groups, independent };
}

function getTaskDepths(tasks: CanvasTaskCard[], links: HierarchyLink[]): Map<string, number> {
  const groupKeys = new Set(tasks.map((task) => task.key));
  const childLinks = new Map<string, string[]>();
  const incomingCount = new Map(tasks.map((task) => [task.key, 0]));
  const depths = new Map(tasks.map((task) => [task.key, 0]));
  for (const link of links) {
    if (!groupKeys.has(link.parentKey) || !groupKeys.has(link.childKey)) continue;
    const children = childLinks.get(link.parentKey) ?? [];
    children.push(link.childKey);
    childLinks.set(link.parentKey, children);
    incomingCount.set(link.childKey, (incomingCount.get(link.childKey) ?? 0) + 1);
  }

  const queue = tasks
    .filter((task) => incomingCount.get(task.key) === 0)
    .map((task) => task.key);
  let cursor = 0;
  while (cursor < queue.length) {
    const parentKey = queue[cursor];
    cursor += 1;
    if (!parentKey) continue;
    for (const childKey of childLinks.get(parentKey) ?? []) {
      depths.set(childKey, Math.max(depths.get(childKey) ?? 0, (depths.get(parentKey) ?? 0) + 1));
      const remaining = (incomingCount.get(childKey) ?? 1) - 1;
      incomingCount.set(childKey, remaining);
      if (remaining === 0) queue.push(childKey);
    }
  }
  return depths;
}

export function buildCanvasLayout({
  tasks,
  selectedTaskKey,
  positions = {},
  measurements = {},
  onSelectTask,
}: CanvasLayoutOptions): { nodes: DashboardNode[]; edges: Edge[] } {
  const nodes: DashboardNode[] = [];
  const edges: Edge[] = [];
  const addNode = (node: DashboardNode, width: number, height: number): void => {
    nodes.push({
      ...node,
      position: positions[node.id] ?? node.position,
      measured: measurements[node.id],
      width,
      height,
      selectable: false,
      focusable: false,
    });
  };
  const addGroupLabel = (id: string, title: string, y: number): void => {
    addNode({
      id,
      type: "lane",
      position: { x: 32, y },
      draggable: false,
      data: { title },
    }, CARD_WIDTH, 28);
  };
  const addTask = (task: CanvasTaskCard, depth: number, y: number): void => {
    addNode({
      id: `task:${task.key}`,
      type: "task",
      position: { x: 32 + depth * COLUMN_STEP, y },
      data: {
        title: task.title,
        task,
        selected: task.key === selectedTaskKey,
        onSelect: () => onSelectTask?.(task.key),
      },
    }, CARD_WIDTH, TASK_HEIGHT);
  };

  const hierarchyLinks = collectHierarchyLinks(tasks);
  const { groups, independent } = groupRelatedTasks(tasks, hierarchyLinks);
  let groupY = 28;
  for (const group of groups) {
    const firstKey = group[0]?.key ?? "empty";
    addGroupLabel(`lane:family:${firstKey}`, `任务关系 · ${group.length}`, groupY);
    const depths = getTaskDepths(group, hierarchyLinks);
    const columns = new Map<number, CanvasTaskCard[]>();
    for (const task of group) {
      const depth = depths.get(task.key) ?? 0;
      const column = columns.get(depth) ?? [];
      column.push(task);
      columns.set(depth, column);
    }

    const taskStartY = groupY + 40;
    let maxRows = 0;
    for (const [depth, column] of columns) {
      maxRows = Math.max(maxRows, column.length);
      column.forEach((task, index) => addTask(task, depth, taskStartY + index * ROW_STEP));
    }
    groupY = taskStartY + maxRows * ROW_STEP + GROUP_GAP;
  }

  if (independent.length > 0) {
    addGroupLabel("lane:independent", `独立任务 · ${independent.length}`, groupY);
    independent.forEach((task, index) => addTask(task, 0, groupY + 40 + index * ROW_STEP));
  }

  for (const link of hierarchyLinks) {
    edges.push({
      id: `hierarchy:${link.parentKey}:${link.childKey}`,
      source: `task:${link.parentKey}`,
      target: `task:${link.childKey}`,
      type: "smoothstep",
      label: "子任务",
      zIndex: 1,
      style: { stroke: "#71849a", strokeWidth: 2, strokeDasharray: "4 4" },
      labelStyle: { fill: "#53697f", fontSize: 10 },
      labelBgStyle: { fill: "#f8faf8" },
    });
  }

  return { nodes, edges };
}
