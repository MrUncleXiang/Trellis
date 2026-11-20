import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const cliRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dashboardDist = path.resolve(cliRoot, "../trellis-dashboard/dist");
const dashboardInstall = path.join(cliRoot, "dashboard");

rmSync(dashboardInstall, { recursive: true, force: true });
mkdirSync(dashboardInstall, { recursive: true });
cpSync(dashboardDist, path.join(dashboardInstall, "dist"), { recursive: true });

console.log("Copied dashboard runtime into the CLI package.");
