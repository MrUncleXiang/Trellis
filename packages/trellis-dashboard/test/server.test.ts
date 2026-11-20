import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDashboardServer, type DashboardServer } from "../src/server/app.js";
import { admitRequest, assertLoopbackBind } from "../src/server/host-guard.js";

const cleanup: (() => void | Promise<void>)[] = [];

afterEach(async () => {
  for (const fn of cleanup.splice(0).reverse()) await fn();
});

function tmpProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dash-srv-"));
  cleanup.push(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.mkdirSync(path.join(dir, ".trellis", "tasks"), { recursive: true });
  return dir;
}

function writeTask(project: string, dirName: string, record: Record<string, unknown>): void {
  const dir = path.join(project, ".trellis", "tasks", dirName);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "task.json"), JSON.stringify(record), "utf8");
  fs.writeFileSync(path.join(dir, "prd.md"), "PRD BODY MUST NOT LEAK", "utf8");
}

async function startServer(project: string): Promise<DashboardServer> {
  const running = await createDashboardServer({
    projectRoot: project,
  }).listen();
  cleanup.push(() => running.close());
  return running;
}

function get(
  running: DashboardServer,
  urlPath: string,
  headers: Record<string, string> = {},
): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const request = http.request(
      {
        host: "127.0.0.1",
        port: running.port,
        path: urlPath,
        method: "GET",
        headers: { host: `127.0.0.1:${running.port}`, ...headers },
      },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk: string) => {
          body += chunk;
        });
        response.on("end", () => resolve({ status: response.statusCode ?? 0, body, headers: response.headers }));
      },
    );
    request.on("error", reject);
    request.end();
  });
}

describe("assertLoopbackBind", () => {
  it("rejects every non-loopback bind address", () => {
    for (const host of ["0.0.0.0", "::", "192.168.1.10", "example.com", "", undefined]) {
      expect(() => assertLoopbackBind(host)).toThrowError(/only listens on 127\.0\.0\.1/);
    }
  });

  it("accepts loopback", () => {
    expect(assertLoopbackBind("127.0.0.1")).toBe("127.0.0.1");
  });
});

describe("host and origin admission", () => {
  it("rejects a hostile Host header", () => {
    const decide = admitRequest({ headers: { host: "evil.example:80" } } as never, 8000);

    expect(decide.allowed).toBe(false);
    expect(decide.reason).toBe("host");
  });

  it("rejects a cross-site Origin", () => {
    const decide = admitRequest(
      { headers: { host: "127.0.0.1:8000", origin: "https://evil.example" } } as never,
      8000,
    );

    expect(decide.allowed).toBe(false);
    expect(decide.reason).toBe("origin");
  });

  it("accepts the matching loopback origin", () => {
    const decide = admitRequest(
      { headers: { host: "127.0.0.1:8000", origin: "http://127.0.0.1:8000" } } as never,
      8000,
    );

    expect(decide.allowed).toBe(true);
  });

  it("rejects the localhost spelling on a different port", () => {
    const decide = admitRequest(
      { headers: { host: "127.0.0.1:8000", origin: "http://localhost:8001" } } as never,
      8000,
    );

    expect(decide.allowed).toBe(false);
    expect(decide.reason).toBe("origin");
  });

  it("rejects the localhost spelling even on the bound port", () => {
    const decide = admitRequest(
      { headers: { host: "127.0.0.1:8000", origin: "http://localhost:8000" } } as never,
      8000,
    );

    expect(decide.allowed).toBe(false);
    expect(decide.reason).toBe("origin");
  });

  it("rejects a localhost Host header", () => {
    const decide = admitRequest({ headers: { host: "localhost:8000" } } as never, 8000);

    expect(decide.allowed).toBe(false);
    expect(decide.reason).toBe("host");
  });

  it("rejects a null Origin", () => {
    const decide = admitRequest(
      { headers: { host: "127.0.0.1:8000", origin: "null" } } as never,
      8000,
    );

    expect(decide.allowed).toBe(false);
    expect(decide.reason).toBe("origin");
  });
});

describe("running server", () => {
  it("does not read or expose assistant sessions", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    const index = await get(running, "/api/tasks");
    const countRoute = await get(running, "/api/task-counts");
    const sourcesRoute = await get(running, "/api/sources");
    const detailRoute = await get(running, "/api/tasks/01-01-synthetic-task");

    expect(index.status).toBe(200);
    expect(index.body).not.toContain("sessionCount");
    expect(index.body).not.toContain("sessions");
    expect(countRoute.status).toBe(404);
    expect(sourcesRoute.status).toBe(404);
    expect(detailRoute.status).toBe(404);
  });

  it("binds only the loopback address", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    expect(running.address).toBe("127.0.0.1");
    const address = running.server.address();
    expect(typeof address === "object" && address !== null ? address.address : address).toBe("127.0.0.1");
  });

  it("serves the task index with both status columns represented", async () => {
    const project = tmpProject();
    writeTask(project, "01-01-plan", { id: "plan", title: "Plan task", description: "Plan desc", status: "planning" });
    writeTask(project, "01-02-run", { id: "run", title: "Run task", description: "Run desc", status: "in_progress" });
    const running = await startServer(project);

    const response = await get(running, "/api/tasks");
    const payload = JSON.parse(response.body) as { tasks: { taskId: string; title: string }[] };

    expect(response.status).toBe(200);
    expect(payload.tasks.map((t) => t.taskId)).toEqual(["plan", "run"]);
    expect(payload.tasks.map((t) => t.title)).toEqual(["Plan task", "Run task"]);
  });

  it("returns archived task records only for an explicit includeArchived query", async () => {
    const project = tmpProject();
    writeTask(project, "01-01-live", {
      id: "live", title: "Live task", description: "Active", status: "in_progress",
    });
    writeTask(project, "archive/2026-01/01-01-old", {
      id: "old", title: "Old task", description: "Archived", status: "completed",
    });
    const running = await startServer(project);

    const defaultResponse = await get(running, "/api/tasks");
    const archiveResponse = await get(running, "/api/tasks?includeArchived=true");
    const defaultPayload = JSON.parse(defaultResponse.body) as { tasks: { taskId: string }[] };
    const archivePayload = JSON.parse(archiveResponse.body) as {
      tasks: { taskId: string; isArchived: boolean }[];
    };

    expect(defaultPayload.tasks.map((task) => task.taskId)).toEqual(["live"]);
    expect(archivePayload.tasks.map((task) => task.taskId)).toEqual(["live", "old"]);
    expect(archivePayload.tasks[1]?.isArchived).toBe(true);
  });

  it("serves the locally bundled canvas stylesheet", async () => {
    const running = await startServer(tmpProject());
    const response = await get(running, "/app.css");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/css");
    expect(response.body).toContain("react-flow");
    expect(response.body).toContain("task-node--planning");
    expect(response.body).toContain("task-node--archived");
  });

  it("serves a client without assistant-session controls", async () => {
    const running = await startServer(tmpProject());
    const response = await get(running, "/app.js");

    expect(response.status).toBe(200);
    expect(response.body).toContain("includeArchived=true");
    expect(response.body).not.toContain("showSessionRelations");
    expect(response.body).not.toContain("api/task-counts");
    expect(response.body).not.toContain("关联会话");
  });

  it("refuses a cross-site Origin at the HTTP layer", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    expect((await get(running, "/api/tasks", { origin: "https://evil.example" })).status).toBe(403);
  });

  it("refuses a hostile Host header at the HTTP layer", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    expect((await get(running, "/api/tasks", { host: "evil.example" })).status).toBe(403);
  });

  it("refuses a localhost Host header at the HTTP layer", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    expect((await get(running, "/api/tasks", { host: `localhost:${running.port}` })).status).toBe(403);
  });

  it("answers HEAD without a body", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    const response = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const request = http.request(
        {
          host: "127.0.0.1",
          port: running.port,
          path: "/api/tasks",
          method: "HEAD",
          headers: { host: `127.0.0.1:${running.port}` },
        },
        (res) => {
          let body = "";
          res.setEncoding("utf8");
          res.on("data", (chunk: string) => {
            body += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
        },
      );
      request.on("error", reject);
      request.end();
    });

    expect(response.status).toBe(200);
    expect(response.body).toBe("");
  });

  it("sends a closed content security policy and no frame embedding", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    const response = await get(running, "/");

    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(response.headers["x-frame-options"]).toBe("DENY");
  });

  it("never emits wildcard CORS headers", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    const response = await get(running, "/api/tasks");

    expect(response.headers["access-control-allow-origin"]).toBeUndefined();
    expect(response.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("rejects non-read methods and unknown paths", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    const post = await new Promise<number>((resolve, reject) => {
      const request = http.request(
        {
          host: "127.0.0.1",
          port: running.port,
          path: "/api/tasks",
          method: "POST",
          headers: { host: `127.0.0.1:${running.port}`, "content-length": "0" },
        },
        (response) => {
          response.resume();
          resolve(response.statusCode ?? 0);
        },
      );
      request.on("error", reject);
      request.end();
    });

    expect(post).toBe(405);
    expect((await get(running, "/etc/passwd")).status).toBe(404);
    expect((await get(running, "/api/tasks/..%2F..%2Fetc")).status).toBe(404);
  });

  it("serves the page without external references", async () => {
    const project = tmpProject();
    const running = await startServer(project);

    const response = await get(running, "/");

    expect(response.status).toBe(200);
    expect(response.body).toContain("/app.js");
    expect(response.body).not.toMatch(/https?:\/\//);
    expect(response.body).not.toContain("google-analytics");
  });

  it("leaves the project tree byte-identical after serving requests", async () => {
    const project = tmpProject();
    writeTask(project, "19-19-synthetic-task", {
      id: "synthetic-task",
      title: "Synthetic task",
      description: "",
      status: "in_progress",
    });
    const hashTree = (): string => {
      const parts: string[] = [];
      const walk = (dir: string): void => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(full);
            continue;
          }
          const digest = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
          parts.push(`${path.relative(project, full)}:${digest}`);
        }
      };
      walk(project);
      return parts.join("\n");
    };
    const before = hashTree();
    const running = await startServer(project);

    await get(running, "/api/tasks");
    await get(running, "/api/tasks/19-19-synthetic-task");

    expect(hashTree()).toBe(before);
  });
});
