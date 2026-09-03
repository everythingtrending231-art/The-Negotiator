import { afterAll, afterEach, beforeAll } from "vitest"
import { resetDb, testPrisma } from "./db"

// Clean slate before the run starts (covers a previous run that crashed
// mid-test and never reached its own afterEach) and after every test, so
// tests never depend on execution order or leak fixtures into each other.
beforeAll(async () => {
  await resetDb()
})

afterEach(async () => {
  await resetDb()
})

afterAll(async () => {
  await testPrisma.$disconnect()
})
