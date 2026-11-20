/**
 * Local read-only HTTP surface for the current project's task canvas.
 *
 * Routes (all GET/HEAD): `/`, `/app.js`, `/app.css` and `/api/tasks`.
 * The task index includes archives only for `?includeArchived=true`.
 * The server does not inspect AI sessions or provide filesystem access.
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { Socket } from "node:net";

import { readTasks, toTaskIndex } from "../task-reader.js";
import { admitRequest, assertLoopbackBind, LOOPBACK_HOST } from "./host-guard.js";
import { renderClientScript, renderClientStyles, renderPage } from "./page.js";

export interface DashboardServerOptions {
  projectRoot: string;
  /** Page markup; injected so tests can assert on the real document. */
  page?: string;
}

export interface DashboardServer {
  server: Server;
  port: number;
  address: string;
  close: () => Promise<void>;
}

const BASE_HEADERS: Record<string, string> = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
  "x-frame-options": "DENY",
  "content-security-policy":
    "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
};

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, {
    ...BASE_HEADERS,
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function sendText(
  response: ServerResponse,
  status: number,
  body: string,
  contentType: string,
): void {
  response.writeHead(status, { ...BASE_HEADERS, "content-type": contentType });
  response.end(body);
}

function methodAllowed(method: string | undefined): boolean {
  return method === "GET" || method === "HEAD";
}

function parseUrl(rawUrl: string | undefined): URL | undefined {
  if (rawUrl === undefined) return undefined;
  try {
    return new URL(rawUrl, `http://${LOOPBACK_HOST}`);
  } catch {
    return undefined;
  }
}

/** Create (but do not start) the dashboard server. */
export function createDashboardServer(options: DashboardServerOptions): {
  server: Server;
  listen: () => Promise<DashboardServer>;
} {
  const page = options.page ?? renderPage();
  const sockets = new Set<Socket>();

  const server = createServer((request: IncomingMessage, response: ServerResponse) => {
    const bound = server.address();
    const boundPort = bound !== null && typeof bound === "object" ? bound.port : 0;

    if (!admitRequest(request, boundPort).allowed) {
      sendJson(response, 403, { error: "forbidden" });
      return;
    }
    if (!methodAllowed(request.method)) {
      response.setHeader("allow", "GET, HEAD");
      sendJson(response, 405, { error: "method-not-allowed" });
      return;
    }

    const url = parseUrl(request.url);
    if (url === undefined) {
      sendJson(response, 400, { error: "bad-request" });
      return;
    }

    const pathname = url.pathname;
    if (pathname === "/") {
      sendText(response, 200, page, "text/html; charset=utf-8");
      return;
    }
    if (pathname === "/app.js") {
      sendText(response, 200, renderClientScript(), "text/javascript; charset=utf-8");
      return;
    }
    if (pathname === "/app.css") {
      sendText(response, 200, renderClientStyles(), "text/css; charset=utf-8");
      return;
    }
    if (pathname === "/api/tasks") {
      sendJson(response, 200, toTaskIndex(readTasks(options.projectRoot, {
        includeArchived: url.searchParams.get("includeArchived") === "true",
      })));
      return;
    }

    sendJson(response, 404, { error: "not-found" });
  });

  server.on("connection", (socket: Socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
  });

  const listen = async (): Promise<DashboardServer> => {
    const host = assertLoopbackBind(LOOPBACK_HOST);
    await new Promise<void>((resolve, reject) => {
      const onError = (error: Error): void => {
        server.off("listening", onListening);
        reject(error);
      };
      const onListening = (): void => {
        server.off("error", onError);
        resolve();
      };
      server.once("error", onError);
      server.once("listening", onListening);
      server.listen(0, host);
    });
    const address = server.address();
    if (address === null || typeof address === "string") {
      throw new Error("dashboard failed to obtain a loopback port");
    }
    return {
      server,
      port: address.port,
      address: address.address,
      close: async () => {
        for (const socket of sockets) socket.destroy();
        sockets.clear();
        await new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      },
    };
  };

  return { server, listen };
}
