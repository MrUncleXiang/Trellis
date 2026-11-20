export type TaskStatusTone = "planning" | "in-progress" | "review" | "completed" | "archived" | "unknown";

export interface TaskStatusPresentation {
  tone: TaskStatusTone;
  label: string;
}

export function getTaskStatusPresentation(status: string, isArchived: boolean): TaskStatusPresentation {
  switch (status) {
    case "planning":
    case "brainstorm":
      return { tone: isArchived ? "archived" : "planning", label: "规划中" };
    case "in_progress":
    case "in-progress":
      return { tone: isArchived ? "archived" : "in-progress", label: "进行中" };
    case "review":
      return { tone: isArchived ? "archived" : "review", label: "评审中" };
    case "completed":
    case "done":
      return { tone: isArchived ? "archived" : "completed", label: "已完成" };
    default:
      return { tone: isArchived ? "archived" : "unknown", label: status };
  }
}
