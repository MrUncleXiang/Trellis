// Strip host-shell session env vars so the OpenCode / Trellis context
// resolvers under test fall through to platform-input-derived keys
// instead of picking up whatever the dev's terminal happens to export.
delete process.env.TRELLIS_CONTEXT_ID;

// Strip CLAUDE_ENV_FILE: session-start.py appends `export TRELLIS_CONTEXT_ID=…`
// to it, so a dev running the suite inside a Claude Code session would write
// test fixture keys into their own real shell setup file.
delete process.env.CLAUDE_ENV_FILE;

// Strip *_PROJECT_DIR vars: shared-hooks/session-start.py prefers them over
// JSON cwd / process cwd, so a dev running tests inside a Claude Code /
// Copilot / etc. session would otherwise have the hook read the *real*
// repo's .trellis/ instead of the test tmpDir.
delete process.env.CLAUDE_PROJECT_DIR;
delete process.env.QODER_PROJECT_DIR;
delete process.env.CODEBUDDY_PROJECT_DIR;
delete process.env.FACTORY_PROJECT_DIR;
delete process.env.CURSOR_PROJECT_DIR;
delete process.env.GEMINI_PROJECT_DIR;
delete process.env.KIRO_PROJECT_DIR;
delete process.env.COPILOT_PROJECT_DIR;

// Strip every session-identity var the platform resolver reads — the source of
// truth is `_ENV_SESSION_KEYS` / `_ENV_CONVERSATION_KEYS` /
// `_ENV_TRANSCRIPT_KEYS` in
// packages/cli/src/templates/trellis/scripts/common/active_task.py.
//
// Without this, running the suite inside a host agent session (this very DSH
// session exports DSH_SESSION_ID) makes `get_current_task()` bind the test
// tmpDir to a live host session: tests that mean "no session identity" instead
// see one, and a test run can even write a pointer into the developer's real
// runtime state. Keep this list in sync when a new platform key is verified.
delete process.env.DSH_SESSION_ID;
// beta's DSH branch reads two more names that the *_SESSION_ID pattern does not
// cover: the managed override and the sentinel that pairs with the session id.
delete process.env.DSH_TRELLIS_CONTEXT_ID;
delete process.env.DSH_SHELL;
// The Pi extension template reads PI_SESSION_ID / PI_SESSIONID directly (its
// `currentSessionId()` ladder), so a dev shell inside a Pi session hands the
// sandboxed extension a live id. `evaluateExtension` merges `{ ...process.env }`
// into the sandbox, which means the leak survives even when a test passes an
// explicit env object — the process value wins whenever the test does not
// override that exact key. Tests that *want* a Pi session id pass it through
// their own env argument, so removing the ambient value is safe.
delete process.env.PI_SESSION_ID;
delete process.env.PI_SESSIONID;
delete process.env.CLAUDE_CODE_SESSION_ID;
delete process.env.CLAUDE_SESSION_ID;
delete process.env.CODEX_THREAD_ID;
delete process.env.GEMINI_SESSION_ID;
delete process.env.GEMINI_TRANSCRIPT_PATH;
delete process.env.QODER_SESSION_ID;
delete process.env.QODER_TRANSCRIPT_PATH;
delete process.env.KIRO_SESSION_ID;
delete process.env.COPILOT_SESSION_ID;
delete process.env.COPILOT_SESSIONID;
delete process.env.SNOW_SESSION_ID;
delete process.env.CURSOR_CONVERSATION_ID;
delete process.env.CURSOR_CONVERSATIONID;
delete process.env.CURSOR_TRANSCRIPT_PATH;
delete process.env.FACTORY_TRANSCRIPT_PATH;
delete process.env.DROID_TRANSCRIPT_PATH;
delete process.env.CODEBUDDY_TRANSCRIPT_PATH;
