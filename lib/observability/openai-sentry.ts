import * as Sentry from "@sentry/nextjs";

/** Wraps the OpenAI-handling part of a route handler for end-to-end duration in Sentry Performance. */
export function runOpenAiRoute<T>(routeKey: string, fn: () => Promise<T>): Promise<T> {
  return Sentry.startSpan(
    {
      name: `api.openai.${routeKey}`,
      op: "http.server",
      attributes: { "kampus.openai_route": routeKey },
    },
    fn,
  );
}

/** Child span for upstream OpenAI HTTP calls (latency visible under the route span). */
export function fetchOpenAi(routeKey: string, url: string, init: RequestInit): Promise<Response> {
  return Sentry.startSpan(
    {
      name: `openai.http.${routeKey}`,
      op: "http.client",
      attributes: {
        "kampus.openai_route": routeKey,
        "http.url": url,
      },
    },
    () => fetch(url, init),
  );
}
