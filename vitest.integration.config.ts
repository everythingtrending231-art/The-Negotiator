import path from "node:path"
import { defineConfig } from "vitest/config"

const TEST_DATABASE_URL =
  process.env.DATABASE_URL_TEST ?? "postgresql://postgres:postgres@localhost:5432/negotiator_test"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/server/test/setup-integration.ts"],
    // Every integration test shares one physical database and cleans it
    // between tests via TRUNCATE (see src/server/test/db.ts) — running
    // test files concurrently would let one file's afterEach truncate
    // wipe data another file's test is still using.
    fileParallelism: false,
    testTimeout: 15000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      DIRECT_URL: TEST_DATABASE_URL,
    },
  },
})
