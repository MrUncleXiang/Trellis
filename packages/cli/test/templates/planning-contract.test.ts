import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getAllScripts } from "../../src/templates/trellis/index.js";
import {
  collectPlatformTemplates,
  PLATFORM_IDS,
} from "../../src/configurators/index.js";

const root = path.resolve(__dirname, "../../../..");
const source = path.join(root, "packages/cli/src/templates");
const sources = [
  "trellis/workflow.md",
  "common/skills/brainstorm.md",
  "common/skills/before-dev.md",
  "common/skills/check.md",
  "common/commands/continue.md",
  "common/commands/start.md",
  "copilot/prompts/brainstorm.prompt.md",
  "copilot/prompts/start.prompt.md",
  "copilot/prompts/before-dev.prompt.md",
  "copilot/prompts/check.prompt.md",
  "common/bundled-skills/trellis-meta/references/platform-files/agents.md",
  "common/bundled-skills/trellis-meta/references/customize-local/change-context-loading.md",
  "common/bundled-skills/trellis-meta/references/local-architecture/task-system.md",
  "common/bundled-skills/trellis-meta/references/customize-local/change-workflow.md",
];

describe("planning contract distribution", () => {
  it("T34 ships the shared implementation through the script map", () => {
    const modulePath = path.join(source, "trellis/scripts/common/planning.py");
    expect(fs.existsSync(modulePath)).toBe(true);
    expect(getAllScripts().get("common/planning.py")).toBe(
      fs.readFileSync(modulePath, "utf-8"),
    );
  });
  it.each(sources)(
    "T36 %s requires three artifacts for new tasks without a lightweight exemption",
    (file) => {
      const text = fs.readFileSync(path.join(source, file), "utf-8");
      expect(text).not.toMatch(
        /(?:Lightweight|lightweight) tasks? (?:can|may) (?:remain |be |have only |omit |request |ask )?PRD-only/,
      );
      expect(text).not.toMatch(/(?:Lightweight|lightweight) tasks? may omit/);
      expect(text).not.toMatch(
        /(?:design|implement)\.md`? (?:if present|if exists|\(if exists\))/,
      );
      expect(text).not.toMatch(/optional `(?:design|implement)\.md`/);
      expect(text).toContain("design.md");
      expect(text).toContain("implement.md");
    },
  );
  it("T35/T37 applies the workflow contract in actual platform template generation", () => {
    for (const platform of PLATFORM_IDS) {
      const templates = collectPlatformTemplates(platform);
      expect(templates, platform).toBeDefined();
      if (!templates) throw new Error(`Missing template map for ${platform}`);
      const planningFiles = [...templates.entries()].filter(([file]) =>
        /(?:continue|brainstorm|start)(?:\.|\/)|trellis-(?:continue|brainstorm|start)\//.test(
          file,
        ),
      );
      expect(planningFiles.length, platform).toBeGreaterThan(0);
      for (const [file, content] of planningFiles) {
        expect(content, `${platform}:${file}`).not.toMatch(
          /Lightweight tasks? (?:may have only|can be) (?:`prd.md`|PRD-only)/,
        );
        expect(content, `${platform}:${file}`).not.toContain(
          "design.md if present",
        );
      }
    }
  });
  it("T35 runtime OpenCode prompts preserve the same planning boundary", () => {
    const text = fs.readFileSync(
      path.join(source, "opencode/plugins/inject-subagent-context.js"),
      "utf-8",
    );
    expect(text).not.toMatch(/(?:technical design|execution plan) if present/);
    expect(text).not.toContain("when present, design.md / implement.md");
    expect(text).not.toContain("when those files are present");
    expect(text).toContain("Every new task requires");
    expect(text).toContain("replan");
  });
  it("T35 generated implement/check agents require all three new-task artifacts", () => {
    for (const platform of PLATFORM_IDS) {
      const templates = collectPlatformTemplates(platform);
      if (!templates) throw new Error(`Missing template map for ${platform}`);
      for (const [file, content] of templates) {
        if (!/(?:agents|droids)\/(?:trellis-)?(?:implement|check)\./.test(file))
          continue;
        expect(content, `${platform}:${file}`).not.toMatch(
          /(?:design|implement)\.md`? (?:if present|if exists|\(if exists\))/,
        );
        expect(content, `${platform}:${file}`).toContain(
          "Every new task requires",
        );
        expect(content, `${platform}:${file}`).toContain("replan");
      }
    }
  });
  it("T36 independent marketplace workflows preserve their own style while applying the gate", () => {
    for (const name of ["native", "tdd", "channel-driven-subagent-dispatch"]) {
      const text = fs.readFileSync(
        path.join(root, "marketplace/workflows", name, "workflow.md"),
        "utf-8",
      );
      expect(text).not.toMatch(/optional `(?:design|implement)\.md`/);
      expect(text).not.toMatch(/Omit the `design\.md` or `implement\.md`/);
      expect(text).toContain("attest");
      expect(text).toContain("--approval-source");
      expect(text).toContain("replan");
      expect(text).not.toContain("Lightweight tasks may be PRD-only");
    }
  });
});
