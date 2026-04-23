export type AnalyticsPayload = Record<string, string | number | boolean | null | undefined>;

/**
 * Client-side analytics hook — swap implementation for PostHog/Segment/etc.
 */
export function trackEvent(event: string, payload?: AnalyticsPayload) {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.info("[kampus:analytics]", event, payload ?? {});
  }

  const w = window as unknown as { kampusAnalytics?: Array<{ event: string; payload?: AnalyticsPayload; ts: number }> };
  if (!w.kampusAnalytics) w.kampusAnalytics = [];
  w.kampusAnalytics.push({ event, payload, ts: Date.now() });
}
