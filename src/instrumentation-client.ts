import * as Sentry from "@sentry/nextjs"

// Optional — an unset DSN makes the SDK a no-op client (matches how
// RESEND_API_KEY/BLOB_READ_WRITE_TOKEN degrade elsewhere in this app), so
// error monitoring is opt-in without any code branching here.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
