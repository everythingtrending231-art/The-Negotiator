import path from "node:path"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    exclude: ["**/node_modules/**", "src/**/*.integration.test.ts"],
    // Some server modules under test instantiate PrismaClient at import
    // time (e.g. src/server/db.ts), which throws if DATABASE_URL is
    // unset — even though these unit tests never issue a real query.
    // A placeholder keeps the suite runnable without a live database.
    env: {
      DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
      DIRECT_URL: "postgresql://user:pass@localhost:5432/test",
    },
  },
})
