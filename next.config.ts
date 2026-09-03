import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs/config"

const nextConfig: NextConfig = {}

// Source map upload only runs when SENTRY_AUTH_TOKEN is set (CI/Vercel) —
// same "silently degrade without the credential" pattern as this app's
// other optional integrations. Without it, the build still succeeds; it
// just ships without deobfuscated stack traces in Sentry.
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  silent: true,
})
