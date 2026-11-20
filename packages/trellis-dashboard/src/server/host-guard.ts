/**
 * Request admission rules for the local server.
 *
 * Three things are refused outright:
 *   1. any bind address that is not loopback (checked before `listen`),
 *   2. any request whose `Host` header is not the loopback address it bound,
 *   3. any cross-origin request, so a random website or a local file cannot
 *      read this data from a browser.
 *
 * The browser has to be opened at `http://127.0.0.1:<port>`; the `localhost`
 * spelling is not accepted as a Host or Origin alias. That keeps one canonical
 * origin instead of an allow-list that can drift.
 *
 * No CORS headers are ever emitted; there is deliberately no allow-list for
 * other origins.
 */

import type { IncomingMessage } from "node:http";

/** The only address this server is allowed to bind. */
export const LOOPBACK_HOST = "127.0.0.1";

/**
 * Refuse a bind host that is not loopback.
 *
 * `undefined`/`""` is rejected too: Node would otherwise bind every interface,
 * which is exactly the failure this guard exists for.
 */
export function assertLoopbackBind(host: string | undefined): string {
  const normalized = (host ?? "").trim().toLowerCase();
  if (normalized !== LOOPBACK_HOST && normalized !== "localhost" && normalized !== "::1") {
    throw new Error(
      `refusing to bind ${JSON.stringify(host ?? "")}: this dashboard only listens on ${LOOPBACK_HOST}`,
    );
  }
  return normalized;
}

export interface AdmissionDecision {
  allowed: boolean;
  reason?: "host" | "origin";
}

function hostnameOf(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.startsWith("[")) {
    const end = trimmed.indexOf("]");
    return end === -1 ? trimmed : trimmed.slice(1, end);
  }
  const colon = trimmed.lastIndexOf(":");
  return colon === -1 ? trimmed : trimmed.slice(0, colon);
}

/**
 * Decide whether one request may be served.
 *
 * `Host` must resolve to a loopback name — this stops DNS-rebinding attacks
 * where a hostile page resolves its own name to 127.0.0.1. `Origin`, when
 * present, must be exactly the loopback origin the server is bound to. A
 * `null` Origin (sandboxed frame, `file://` page) is refused as well: it is not
 * the dashboard's own origin.
 */
export function admitRequest(
  request: IncomingMessage,
  boundPort: number,
): AdmissionDecision {
  const hostHeader = request.headers.host;
  if (typeof hostHeader !== "string" || hostHeader.length === 0) {
    return { allowed: false, reason: "host" };
  }
  if (hostnameOf(hostHeader) !== LOOPBACK_HOST) {
    return { allowed: false, reason: "host" };
  }

  const origin = request.headers.origin;
  if (origin !== undefined) {
    if (origin !== `http://${LOOPBACK_HOST}:${boundPort}`) {
      return { allowed: false, reason: "origin" };
    }
  }
  return { allowed: true };
}
