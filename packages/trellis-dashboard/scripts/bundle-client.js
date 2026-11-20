/**
 * Bundle the browser entry point and copy static assets into `dist/`.
 *
 * Outputs:
 *   dist/public/app.js    — browser bundle served at /app.js
 *   dist/server/page.html — the shell read by `page.ts`
 *
 * Runs after `tsc` as part of `pnpm build`.
 */

import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "dist");

mkdirSync(join(dist, "public"), { recursive: true });
mkdirSync(join(dist, "server"), { recursive: true });

await build({
  entryPoints: [join(root, "src", "client", "main.tsx")],
  outfile: join(dist, "public", "app.js"),
  bundle: true,
  format: "iife",
  platform: "browser",
  target: ["es2020"],
  minify: true,
  logLevel: "warning",
});

copyFileSync(
  join(root, "src", "server", "page.html"),
  join(dist, "server", "page.html"),
);
