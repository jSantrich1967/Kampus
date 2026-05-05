import * as Sentry from "@sentry/nextjs";

import { clientTracesSampleRate } from "@/lib/observability/traces-sample-rate";

// Client (browser). If NEXT_PUBLIC_SENTRY_DSN is unset, the SDK stays inactive.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: clientTracesSampleRate(),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
