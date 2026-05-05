/**
 * Sentry performance tracing sample rate (0–1).
 * Server/edge: SENTRY_TRACES_SAMPLE_RATE (not exposed to the browser).
 * Client: NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE (optional; defaults match server defaults).
 */
function parseRate(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  return fallback;
}

export function serverTracesSampleRate(): number {
  const fallback = process.env.NODE_ENV === "production" ? 0.05 : 1;
  return parseRate(process.env.SENTRY_TRACES_SAMPLE_RATE?.trim(), fallback);
}

export function clientTracesSampleRate(): number {
  const fallback = process.env.NODE_ENV === "production" ? 0.05 : 1;
  return parseRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE?.trim(), fallback);
}
