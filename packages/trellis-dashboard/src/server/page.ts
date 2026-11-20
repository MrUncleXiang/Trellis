/**
 * Serve the single-page shell.
 *
 * The markup lives in `page.html` and the behaviour in `src/client/main.ts`,
 * bundled to `dist/public/app.js`. Nothing is fetched from a CDN; the page has
 * no analytics and no external fonts or images.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(here, "..", "..");
const builtRoot = path.join(packageRoot, "dist");
const publicRoot = path.join(builtRoot, "public");

/** Absolute path of the bundled client script. */
export const CLIENT_SCRIPT_PATH = path.join(publicRoot, "app.js");
export const CLIENT_STYLES_PATH = path.join(publicRoot, "app.css");

export function renderPage(): string {
  const sourcePage = path.join(here, "page.html");
  const builtPage = path.join(builtRoot, "server", "page.html");
  return fs.readFileSync(fs.existsSync(sourcePage) ? sourcePage : builtPage, "utf8");
}

export function renderClientScript(): string {
  return fs.readFileSync(CLIENT_SCRIPT_PATH, "utf8");
}

export function renderClientStyles(): string {
  return fs.readFileSync(CLIENT_STYLES_PATH, "utf8");
}
