import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  collectPlatformTemplates,
  PLATFORM_IDS,
} from "../../src/configurators/index.js";
import { workflowMdTemplate } from "../../src/templates/trellis/index.js";
import { getPythonCommandForPlatform } from "../../src/configurators/shared.js";

const PYTHON = getPythonCommandForPlatform();
const hasPython = (): boolean =>
  spawnSync(PYTHON, ["--version"], { stdio: "ignore" }).status === 0;

const repoRoot = fs.existsSync(path.join(process.cwd(), "marketplace"))
  ? process.cwd()
  : path.resolve(process.cwd(), "../..");

const normalizeEol = (content: string): string =>
  content.replace(/\r\n/g, "\n");

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf-8");
}

function stateBlock(content: string, status: string): string {
  const pattern = new RegExp(
    "\\[workflow-state:" +
      status +
      "\\]([\\s\\S]*?)\\[/workflow-state:" +
      status +
      "\\]",
  );
  const match = pattern.exec(content);
  if (!match) {
    throw new Error("Missing workflow-state block: " + status);
  }
  return match[1];
}

function collect(platform: (typeof PLATFORM_IDS)[number]): Map<string, string> {
  const templates = collectPlatformTemplates(platform);
  if (!templates) {
    throw new Error("Platform " + platform + " has no collected templates");
  }
  return templates;
}

function entries(map: Map<string, string>): [string, string][] {
  return Array.from(map.entries());
}

function findEntry(
  map: Map<string, string>,
  predicate: (filePath: string, content: string) => boolean,
): [string, string] | undefined {
  return entries(map).find(([filePath, content]) =>
    predicate(filePath, content),
  );
}

function expectPlanningResearchSemantics(content: string, label: string): void {
  expect(content, label).toMatch(/research/i);
  expect(content, label).toMatch(/prd\.md/i);
  expect(content, label).toMatch(/##\s*Research/i);
  expect(content, label).toMatch(/main session/i);
  expect(content, label).toMatch(/save|persist|record/i);
  expect(content, label).toMatch(/assigned research scope/i);
}

function expectExecutionResearchSemantics(content: string, label: string): void {
  expect(content, label).toMatch(/research/i);
  expect(content, label).toMatch(/prd\.md/i);
  expect(content, label).toMatch(/main session/i);
  expect(content, label).toMatch(/save and integrate/i);
  expect(content, label).toMatch(/return to planning/i);
  expect(content, label).toMatch(/source, finding and impact/i);
  expect(content, label).toMatch(/does not authorize rewriting task planning/i);
  expect(content, label).toMatch(/research workers save only assigned research/i);
}

function expectResearchDispatchContract(content: string, label: string): void {
  expect(content, label).toMatch(/Active task:/);
  expect(content, label).toMatch(/research\/<topic>\.md/);
  expect(content, label).toMatch(/locatable sources/i);
  expect(content, label).toMatch(/conclusion\/limits/i);
  expect(content, label).toMatch(/decision impact/i);
  expect(content, label).toMatch(/facts\/inferences\/unknowns/i);
  expect(content, label).toMatch(/main session/i);
  expect(content, label).toMatch(/actually read/i);
  expect(content, label).toMatch(/request missing content/i);
  expect(content, label).toMatch(/return to the main session/i);
}

function expectRecoveryNewEvidenceHandoff(content: string, label: string): void {
  const handoff = content.match(
    /(?:this turn|current turn)[^.]*external evidence[^.]*/i,
  )?.[0] ?? "";
  expect(handoff, label + " newly discovered decision evidence").toMatch(
    /(?:this|current) turn.*discover.*external evidence.*used.*task decision/i,
  );
  expect(handoff, label + " planning save rules").toMatch(
    /follow.*brainstorm.*research handoff rules/i,
  );
  expect(handoff, label + " save before presenting").toMatch(
    /save.*before.*presenting.*conclusion/i,
  );
  expect(handoff, label + " conflicting findings").toMatch(/findings conflict/i);
  expect(handoff, label + " no reliable answer").toMatch(
    /no reliable answer.*found/i,
  );
}

const workflowFiles = [
  {
    label: "bundled native workflow",
    content: workflowMdTemplate,
  },
  {
    label: "marketplace native workflow",
    content: readRepoFile("marketplace/workflows/native/workflow.md"),
  },
  {
    label: "marketplace TDD workflow",
    content: readRepoFile("marketplace/workflows/tdd/workflow.md"),
  },
  {
    label: "marketplace channel workflow",
    content: readRepoFile(
      "marketplace/workflows/channel-driven-subagent-dispatch/workflow.md",
    ),
  },
];

describe("research evidence workflow contract", () => {
  it("keeps the four planning/execution state blocks with research semantics", () => {
    for (const workflow of workflowFiles) {
      const planning = stateBlock(workflow.content, "planning");
      const planningInline = stateBlock(workflow.content, "planning-inline");
      const inProgress = stateBlock(workflow.content, "in_progress");
      const inProgressInline = stateBlock(
        workflow.content,
        "in_progress-inline",
      );

      expectPlanningResearchSemantics(
        planning,
        workflow.label + " planning",
      );
      expectPlanningResearchSemantics(
        planningInline,
        workflow.label + " planning-inline",
      );
      expectExecutionResearchSemantics(
        inProgress,
        workflow.label + " in_progress",
      );
      expectExecutionResearchSemantics(
        inProgressInline,
        workflow.label + " in_progress-inline",
      );

      expect(inProgress, workflow.label).toMatch(
        /implement\/check workers report source, finding and impact/i,
      );
      expect(inProgress, workflow.label).toMatch(
        /does not authorize rewriting task planning/i,
      );
      expect(inProgress, workflow.label).toMatch(
        /research workers save only assigned research/i,
      );
      expect(inProgress, workflow.label).toMatch(
        /do NOT spawn another|do not use native/i,
      );
    }
  });

  it("keeps the native marketplace mirror byte-identical", () => {
    const marketplaceNative = readRepoFile(
      "marketplace/workflows/native/workflow.md",
    );
    expect(marketplaceNative).toBe(workflowMdTemplate);
  });

  it("keeps the research dispatch task path, target file, minimum content, and main-session read acceptance", () => {
    for (const workflow of workflowFiles) {
      expectResearchDispatchContract(workflow.content, workflow.label);
      const integration = workflow.content
        .split(/\r?\n/)
        .find((line) => /\*\*Return and integration\*\*/i.test(line)) ?? "";
      expect(integration, workflow.label + " main-session acceptance").toMatch(
        /main session must.*read.*check.*conclusion.*limits/i,
      );
      expect(integration, workflow.label + " evidence distinctions").toMatch(
        /(?:distinction|distinguish|separat).*facts.*inferences.*unknowns/i,
      );
    }
  });

  it("keeps both source recovery entries on the research recheck path", () => {
    for (const name of ["start.md", "continue.md"]) {
      const content = readRepoFile(
        "packages/cli/src/templates/common/commands/" + name,
      );
      expect(content, name).toMatch(/## Research/);
      expect(content, name).toMatch(/prd\.md/);
      expect(content, name).toMatch(/research/i);
      const returnCondition = content
        .split(/\r?\n/)
        .find((line) => /return to the relevant planning step/i.test(line)) ?? "";
      for (const trigger of [
        /premise no longer applies/i,
        /required version is unverified/i,
        /unresolved unknown affects the agreed result/i,
      ]) {
        expect(returnCondition, name + " return-to-planning trigger").toMatch(trigger);
      }
      expect(returnCondition, name).toMatch(/return to the relevant planning step/i);
      expect(content, name).toMatch(/prd\.md.*absent|absent.*prd\.md/i);
      expectRecoveryNewEvidenceHandoff(content, name);
    }
  });

  it("keeps evidence retention limited in brainstorming and every workflow", () => {
    const sources = [
      ...workflowFiles,
      {
        label: "brainstorm skill",
        content: readRepoFile(
          "packages/cli/src/templates/common/skills/brainstorm.md",
        ),
      },
    ];
    for (const { label, content } of sources) {
      expect(content, label + " necessary evidence only").toMatch(
        /(?:save|persist|record) only necessary facts.*accessible source identifiers/i,
      );
      expect(content, label + " sensitive data removal").toMatch(
        /(?:remove|strip|redact).*credentials.*unrelated personal data/i,
      );
      expect(content, label + " unrelated raw payload exclusion").toMatch(
        /(?:do not|never).*(?:persist|save|store).*unrelated raw request\/response payloads/i,
      );
    }
  });

  it("keeps the planning skill's B1-B7 semantic groups, not just its heading", () => {
    const content = readRepoFile(
      "packages/cli/src/templates/common/skills/brainstorm.md",
    );
    const groups: [string, RegExp][] = [
      [
        "save before presenting the conclusion",
        /save it before presenting that conclusion|before presenting or acting on the conclusion/i,
      ],
      [
        "four external source kinds",
        /online material[\s\S]*local third-party[\s\S]*user-provided[\s\S]*experiments/i,
      ],
      [
        "applicable version or access date",
        /version, commit, or access date|version.*commit.*access date/i,
      ],
      [
        "user material is not independently verified",
        /user-provided[\s\S]*not.*independently verified|must not be presented as independently verified/i,
      ],
      [
        "question, source, conclusion limits, and decision impact",
        /question[\s\S]*locatable source[\s\S]*conclusion and limits[\s\S]*decision impact/i,
      ],
      [
        "facts, inferences, and unknowns stay distinct",
        /facts, inferences, and unknowns|facts.*inferences.*unknowns/i,
      ],
      [
        "unnecessary, reused, and no reliable answer are distinct",
        /(?=[\s\S]*unnecessary)(?=[\s\S]*reused)(?=[\s\S]*(no reliable answer|sources conflict|not found))/i,
      ],
      [
        "handoff index, path basis, and readiness recheck",
        /## Research[\s\S]*task-relative paths[\s\S]*repository-root paths[\s\S]*Before declaring planning ready[\s\S]*references resolve/i,
      ],
    ];

    for (const [label, pattern] of groups) {
      expect(content, label).toMatch(pattern);
    }
  });

  it("keeps before-dev and check on actual reads, stale-premise return, and bounded Decision Evidence", () => {
    const beforeDev = readRepoFile(
      "packages/cli/src/templates/common/skills/before-dev.md",
    );
    expect(beforeDev).toMatch(/Read current task artifacts/);
    expect(beforeDev).toMatch(/## Research/);
    expect(beforeDev).toMatch(
      /research records referenced there that affect implementation/,
    );
    expect(beforeDev).toMatch(
      /missing, unreadable, or a key unknown or outdated premise affects implementation, return to planning/i,
    );
    expect(beforeDev).not.toMatch(/save and integrate|rewrite task planning/i);

    const check = readRepoFile(
      "packages/cli/src/templates/common/skills/check.md",
    );
    expect(check).toMatch(/## Research/);
    expect(check).toMatch(
      /research records referenced there that affect implementation or acceptance/,
    );
    expect(check).toMatch(/### Decision Evidence/);
    expect(check).toMatch(
      /For each key decision, compared the implementation or result with the cited evidence and its applicable limits/i,
    );
    expect(check).toMatch(
      /Unknowns that affect agreed behavior have a handling decision/i,
    );
    expect(check).toMatch(
      /Findings identify the source or record and distinguish facts, inferences, and unknowns/i,
    );
    expect(check).not.toMatch(
      /save and integrate|rewrite task planning|update .*prd\.md/i,
    );

    const workflowCheck = workflowMdTemplate.slice(
      workflowMdTemplate.indexOf("#### 2.2 Quality check"),
      workflowMdTemplate.indexOf("#### 2.3 Rollback"),
    );
    expect(workflowCheck).toMatch(
      /Missing or stale evidence that can change the agreed result returns to planning/i,
    );
  });

  it("discovers planning, recovery, before-dev, and check entries from every real platform collector", () => {
    for (const platform of PLATFORM_IDS) {
      const templates = collect(platform);

      const planning = findEntry(
        templates,
        (_filePath, content) =>
          content.includes("Research Evidence Handoff") &&
          content.includes("Non-Negotiable Evidence Rule"),
      );
      expect(planning, platform + " planning skill").toBeDefined();

      const beforeDev = findEntry(
        templates,
        (_filePath, content) =>
          content.includes("Read current task artifacts") &&
          content.includes("## Research") &&
          content.includes("research records"),
      );
      expect(beforeDev, platform + " before-dev skill").toBeDefined();

      const check = findEntry(
        templates,
        (_filePath, content) =>
          (content.includes("Code Quality Check") &&
            content.includes("## Research") &&
            content.includes("research records")) ||
          (content.includes("Check Agent") &&
            content.includes("check.jsonl") &&
            /research/i.test(content)),
      );
      expect(check, platform + " check entry").toBeDefined();
      expect(check?.[1], platform + " check research").toMatch(/research/i);
      expect(check?.[1], platform + " check research source").toMatch(
        /check\.jsonl|## Research/,
      );

      const recovery = entries(templates).filter(([filePath]) =>
        /(?:^|\/)(?:trellis-)?(?:start|continue)(?:\.prompt)?\.(?:md|toml|json)$/.test(
          filePath,
        ) ||
        /(?:^|\/)trellis-(?:start|continue)\/SKILL\.md$/.test(filePath) ||
        /(?:^|\/)session-start\.py$/.test(filePath),
      );
      expect(recovery.length, platform + " recovery entry").toBeGreaterThan(0);

      for (const [filePath, content] of recovery) {
        if (/(?:^|\/)session-start\.py$/.test(filePath)) {
          expect(content, platform + " " + filePath).toMatch(
            /SessionStart|session context|workflow/i,
          );
          continue;
        }
        expectRecoveryNewEvidenceHandoff(content, platform + " " + filePath);
        expect(content, platform + " " + filePath).toMatch(/## Research/);
        expect(content, platform + " " + filePath).toMatch(/prd\.md/);
        expect(content, platform + " " + filePath).toMatch(/research/i);
        expect(content, platform + " " + filePath).toMatch(
          /return to the relevant planning step|return to planning/i,
        );
      }
    }
  });

  it("keeps shared .agents/skills content identical across platforms", () => {
    const sharedByPath = new Map<string, Map<string, string>>();

    for (const platform of PLATFORM_IDS) {
      for (const [filePath, content] of collect(platform)) {
        if (!filePath.startsWith(".agents/skills/")) continue;
        const byPlatform = sharedByPath.get(filePath) ?? new Map();
        byPlatform.set(platform, normalizeEol(content));
        sharedByPath.set(filePath, byPlatform);
      }
    }

    expect(sharedByPath.size).toBeGreaterThan(0);
    for (const [filePath, byPlatform] of sharedByPath) {
      const contents = new Set(byPlatform.values());
      expect(contents.size, filePath).toBe(1);
      for (const content of contents) {
        expect(content, filePath).not.toContain("{{CMD_REF");
        expect(content, filePath).not.toContain("{{CLI_FLAG}}");
      }
    }
  });
});

const TEMPLATE_SCRIPTS = path.resolve(
  __dirname,
  "../../src/templates/trellis/scripts",
);
const SHARED_HOOKS = path.resolve(__dirname, "../../src/templates/shared-hooks");

function setupHookRepo(tmp: string): void {
  fs.mkdirSync(path.join(tmp, ".trellis", "scripts"), { recursive: true });
  fs.cpSync(TEMPLATE_SCRIPTS, path.join(tmp, ".trellis", "scripts"), {
    recursive: true,
  });
  for (const platformDir of [".claude", ".codex"]) {
    fs.mkdirSync(path.join(tmp, platformDir, "hooks"), { recursive: true });
    fs.copyFileSync(
      path.join(SHARED_HOOKS, "inject-workflow-state.py"),
      path.join(tmp, platformDir, "hooks", "inject-workflow-state.py"),
    );
  }
  fs.mkdirSync(path.join(tmp, ".trellis", "tasks", "01-01-test"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(tmp, ".trellis", "tasks", "01-01-test", "task.json"),
    JSON.stringify({ status: "planning" }),
  );
  fs.mkdirSync(path.join(tmp, ".trellis", ".runtime", "sessions"), {
    recursive: true,
  });
  fs.writeFileSync(
    path.join(tmp, ".trellis", ".runtime", "sessions", "test-session.json"),
    JSON.stringify({ current_task: ".trellis/tasks/01-01-test" }),
  );
  fs.writeFileSync(path.join(tmp, ".trellis", "workflow.md"), workflowMdTemplate);
}

const describeHook = hasPython() ? describe : describe.skip;

describeHook("existing workflow-state hook output", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trellis-research-contract-"));
    setupHookRepo(tmp);
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function runHook(
    platform: "claude" | "codex",
    platformEnv: Record<string, string>,
  ): string {
    const platformDir = platform === "codex" ? ".codex" : ".claude";
    const result = spawnSync(
      PYTHON,
      [path.join(tmp, platformDir, "hooks", "inject-workflow-state.py")],
      {
        cwd: tmp,
        encoding: "utf-8",
        input: JSON.stringify({
          hook_event_name: "UserPromptSubmit",
          cwd: tmp,
          session_id: "test-session",
          prompt: "hi",
        }),
        env: {
          ...process.env,
          TRELLIS_CONTEXT_ID: "test-session",
          ...platformEnv,
        },
      },
    );
    expect(result.status, result.stderr).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      hookSpecificOutput?: { additionalContext?: string };
    };
    return parsed.hookSpecificOutput?.additionalContext ?? "";
  }

  function writeTaskStatus(status: "planning" | "in_progress"): void {
    fs.writeFileSync(
      path.join(tmp, ".trellis", "tasks", "01-01-test", "task.json"),
      JSON.stringify({ status }),
    );
  }

  it("emits real planning and in_progress blocks from the Python hook", () => {
    for (const status of ["planning", "in_progress"] as const) {
      writeTaskStatus(status);
      const context = runHook("claude", { CLAUDE_PROJECT_DIR: tmp });
      expect(context).toContain("<workflow-state>");
      expect(context).toContain("(" + status + ")");
      expect(context).toMatch(/research/i);
    }
  });

  it("selects inline blocks through Codex dispatch_mode without fake task statuses", () => {
    fs.writeFileSync(
      path.join(tmp, ".trellis", "config.yaml"),
      "codex:\n  dispatch_mode: inline\n",
    );

    for (const status of ["planning", "in_progress"] as const) {
      writeTaskStatus(status);
      const context = runHook("codex", { CODEX_THREAD_ID: "test-session" });
      expect(context).toContain("<workflow-state>");
      expect(context).toContain("(" + status + ")");
      expect(context).toContain("<codex-mode>inline:");
      expect(context).toMatch(/research/i);
      expect(context).toContain(
        status === "planning"
          ? "Inline mode: skip jsonl curation"
          : "Do not dispatch implement/check sub-agents",
      );
      expect(context).not.toContain("Sub-agent mode: curate");
    }
  });
});
