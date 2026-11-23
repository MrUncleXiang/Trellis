import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 30s, not 10s: the per-platform template fan-out in
    // test/configurators/platforms.test.ts runs 12-13s on Windows, where every
    // file write plus the submodule diff is slower than on Linux CI. The suite
    // is dominated by these end-to-end fixtures, not by slow assertions.
    testTimeout: 30_000,
    // Cap the pool on machines with many cores. Left to `cpus()`, a 20-core
    // Windows box runs 20 vitest workers against a handful of fixtures that
    // each shell out to git/python and rewrite whole config trees; the I/O
    // contention pushes those fixtures past `testTimeout`, which surfaces as
    // `STACK_TRACE_ERROR` at the test body (ablate #1/#4, platforms detect /
    // byte-for-byte / writes-no-file). Measured on this repo: default pool
    // 5-8 failures per run, `--maxWorkers=4` 0 failures twice, and the two
    // runs take a similar wall time because the suite is I/O bound, not CPU
    // bound. CI runners have <= 4 cores, so the cap is a no-op there.
    maxWorkers: 4,
    include: ["test/**/*.test.ts"],
    exclude: ["third/**", "node_modules/**"],
    setupFiles: ["./test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/cli/index.ts"],
      reportsDirectory: "./coverage",
    },
  },
});
