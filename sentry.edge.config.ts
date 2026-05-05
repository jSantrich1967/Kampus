import * as Sentry from "@sentry/nextjs";

import { serverTracesSampleRate } from "@/lib/observability/traces-sample-rate";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  sendDefaultPii: false,
  tracesSampleRate: serverTracesSampleRate(),
});
