import React, { useCallback, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeProps,
  type OnNodesChange,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./canvas.css";

import { buildCanvasLayout, type DashboardNode } from "./canvas-layout.js";
import { getTaskStatusPresentation } from "./status-presentation.js";
import type { CanvasTaskCard, TaskIndex } from "../types.js";

function TaskNode({ data }: NodeProps<DashboardNode>): React.JSX.Element {
  const task = data.task;
  if (!task) return <div className="task-node" />;
  const status = getTaskStatusPresentation(task.status, task.isArchived);
  return (
    <div
      className={`task-node task-node--${status.tone}${data.selected ? " selected" : ""}`}
      role="button"
      tabIndex={0}
      aria-label={`${task.title}，${status.label}${task.isArchived ? "，已归档" : ""}`}
      onClick={data.onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") data.onSelect?.();
      }}
    >
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={`node-kicker node-kicker--${status.tone}`}>
        <span className="status-dot" />
        <span>{status.label}</span>
        {task.isArchived && <span className="archive-badge">已归档</span>}
      </div>
      <div className="node-title">{task.title}</div>
      <div className="node-description">{task.description || "未填写任务目的"}</div>
    </div>
  );
}

function LaneNode({ data }: NodeProps<DashboardNode>): React.JSX.Element {
  return <div className="lane-node">{data.title}</div>;
}

const nodeTypes = { lane: LaneNode, task: TaskNode };

function Details({ task, onClose }: {
  task: CanvasTaskCard | null;
  onClose: () => void;
}): React.JSX.Element {
  const [copyState, setCopyState] = useState("复制任务编号");
  React.useEffect(() => {
    setCopyState("复制任务编号");
  }, [task?.key]);

  const copyTaskId = async (): Promise<void> => {
    if (!task) return;
    try {
      await navigator.clipboard.writeText(task.taskId);
      setCopyState("已复制");
    } catch {
      setCopyState("请手动选择编号复制");
    }
  };

  if (task === null) {
    return (
      <aside className="details empty-details">
        <div className="detail-placeholder">选择一个任务<br />查看详细信息</div>
      </aside>
    );
  }

  const status = getTaskStatusPresentation(task.status, task.isArchived);

  return (
    <aside className="details">
      <div className="details-header">
        <div>
          <div className="detail-eyebrow">任务详情</div>
          <h2>{task.title}</h2>
        </div>
        <button className="icon-button" onClick={onClose} aria-label="关闭详情">×</button>
      </div>
      <p className="detail-description">{task.description || "暂无简介"}</p>
      <div className="task-id-block">
        <div className="detail-eyebrow">任务编号</div>
        <code>{task.taskId}</code>
        <button onClick={() => void copyTaskId()}>{copyState}</button>
      </div>
      <div className="task-metadata">
        <div className="detail-stat"><span>状态</span><strong>
          {status.label}{task.isArchived ? " · 已归档" : ""}
        </strong></div>
        <div className="detail-stat"><span>优先级</span><strong>{task.priority}</strong></div>
        <div className="detail-stat"><span>负责人</span><strong>{task.assignee || "未指定"}</strong></div>
        <div className="detail-stat"><span>创建时间</span><strong>{task.createdAt || "未知"}</strong></div>
        {task.completedAt && <div className="detail-stat"><span>完成时间</span><strong>{task.completedAt}</strong></div>}
        <div className="detail-stat"><span>所属模块</span><strong>{task.package || "未指定"}</strong></div>
        <div className="detail-stat"><span>任务范围</span><strong>{task.scope || "未指定"}</strong></div>
        <div className="detail-stat">
          <span>任务层级</span>
          <strong>{task.hasParent ? "有父任务" : "顶层任务"} · {task.childCount} 个子任务</strong>
        </div>
      </div>
    </aside>
  );
}

function FitButton(): React.JSX.Element {
  const { fitView } = useReactFlow();
  return <button className="fit-button" onClick={() => fitView({ padding: 0.18, duration: 250 })}>适配画布</button>;
}

function FitWhenExpanded({ nodeCount }: { nodeCount: number }): null {
  const { fitView } = useReactFlow();
  React.useEffect(() => {
    if (nodeCount > 0) fitView({ padding: 0.16, duration: 220 });
  }, [fitView, nodeCount]);
  return null;
}

function App(): React.JSX.Element {
  const [tasks, setTasks] = useState<CanvasTaskCard[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [nodePositions, setNodePositions] = useState<Record<string, XYPosition>>({});
  const [nodeMeasurements, setNodeMeasurements] = useState<Record<string, { width: number; height: number }>>({});
  const [error, setError] = useState(false);
  const selectTask = useCallback((key: string): void => {
    setSelectedTaskKey((current) => current === key ? null : key);
  }, []);
  const graph = useMemo(() => buildCanvasLayout({
    tasks,
    selectedTaskKey,
    positions: nodePositions,
    measurements: nodeMeasurements,
    onSelectTask: selectTask,
  }), [tasks, selectedTaskKey, nodePositions, nodeMeasurements, selectTask]);
  const onNodesChange = useCallback<OnNodesChange<DashboardNode>>((changes) => {
    const updatedNodes = changes.applyTo(graph.nodes);
    setNodeMeasurements((current) => {
      let next = current;
      for (const node of updatedNodes) {
        const width = node.measured?.width;
        const height = node.measured?.height;
        if (typeof width !== "number" || typeof height !== "number") continue;
        const previous = current[node.id];
        if (previous?.width === width && previous.height === height) continue;
        if (next === current) next = { ...current };
        next[node.id] = { width, height };
      }
      return next;
    });
    setNodePositions((current) => {
      const next = { ...current };
      for (const updated of updatedNodes) {
        const previous = graph.nodes.find((node) => node.id === updated.id);
        if (previous && (previous.position.x !== updated.position.x || previous.position.y !== updated.position.y)) {
          next[updated.id] = updated.position;
        }
      }
      return next;
    });
  }, [graph.nodes]);
  const selectedTask = tasks.find((task) => task.key === selectedTaskKey) ?? null;
  const close = (): void => setSelectedTaskKey(null);

  React.useEffect(() => {
    let cancelled = false;
    const endpoint = showArchived ? "/api/tasks?includeArchived=true" : "/api/tasks";
    void fetch(endpoint, { credentials: "omit" })
      .then(async (response) => {
        if (!response.ok) throw new Error("task index request failed");
        const index = await response.json() as TaskIndex;
        if (!cancelled) {
          setTasks(index.tasks);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => { cancelled = true; };
  }, [showArchived]);

  const visibleTaskCount = graph.nodes.filter((node) => node.type === "task").length;
  const archivedTaskCount = tasks.filter((task) => task.isArchived).length;
  const setArchiveVisibility = (visible: boolean): void => {
    setSelectedTaskKey(null);
    if (!visible) setTasks((current) => current.filter((task) => !task.isArchived));
    setShowArchived(visible);
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div><div className="brand-mark">T</div></div>
        <div className="header-title"><h1>Trellis 任务画布</h1><p>本机只读 · 仅查看任务信息</p></div>
        <label className="archive-toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setArchiveVisibility(event.currentTarget.checked)}
          />
          显示归档任务
        </label>
        <div className="header-count" aria-live="polite">
          {visibleTaskCount} 个任务{showArchived ? ` · ${archivedTaskCount} 个归档` : ""}
        </div>
      </header>
      <main className="workspace">
        <section className="canvas-shell" aria-label="任务关系画布">
          {error && <div className="canvas-error">无法读取任务，请刷新页面重试。</div>}
          {!error && tasks.length === 0 && <div className="canvas-empty">当前项目没有任务</div>}
          <ReactFlowProvider>
            <ReactFlow
              nodes={graph.nodes}
              edges={graph.edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              fitView
              fitViewOptions={{ padding: 0.12 }}
              minZoom={0.1}
              maxZoom={1.6}
              nodesConnectable={false}
              elementsSelectable
              proOptions={{ hideAttribution: true }}
            >
              <Background color="#dfe5e1" gap={22} size={1} />
              <Controls showInteractive={false} />
              <FitButton />
              <FitWhenExpanded nodeCount={graph.nodes.length} />
            </ReactFlow>
          </ReactFlowProvider>
        </section>
        <Details task={selectedTask} onClose={close} />
      </main>
      <footer className="legend">
        <span><i className="status-sample status-sample--planning" />规划中</span>
        <span><i className="status-sample status-sample--in-progress" />进行中</span>
        <span><i className="status-sample status-sample--review" />评审中</span>
        <span><i className="status-sample status-sample--completed" />已完成</span>
        <span><i className="status-sample status-sample--archived" />已归档</span>
        <span><i className="status-sample status-sample--unknown" />其他状态</span>
        <span><i className="line-sample hierarchy-line" />子任务关系</span>
        <span>滚轮缩放 · 拖动画布 · 拖动卡片调整位置</span>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById("root");
if (rootElement === null) throw new Error("missing root element");
createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
