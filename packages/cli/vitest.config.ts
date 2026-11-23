import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // 30s, not 10s: the per-platform template fan-out in
    // test/configurators/platforms.test.ts runs 12-13s on Windows, where every
    // file write plus the submodule diff is slower than on Linux CI. The suite
    // is dominated by these end-to-end fixtures, not by slow assertions.
    testTimeout: 30_000,
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
