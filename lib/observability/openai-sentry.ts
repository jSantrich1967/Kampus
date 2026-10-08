import * as Sentry from "@sentry/nextjs";

import { modelFromRequestBody } from "@/lib/ai/estimate-cost";
import { aiBudgetBlockResponse } from "@/lib/ai/enforce-ai-budget";
import { recordOpenAiResponse } from "@/lib/ai/record-ai-usage";

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
  const startedAt = Date.now();
  const model = modelFromRequestBody(init.body);
  return Sentry.startSpan(
    {
      name: `openai.http.${routeKey}`,
      op: "http.client",
      attributes: {
        "kampus.openai_route": routeKey,
        "http.url": url,
      },
    },
    async () => {
      const blocked = await aiBudgetBlockResponse();
      if (blocked) return blocked;
      // Ninguna llamada a la IA puede esperar para siempre: si OpenAI no
      // responde en 90 s, abortamos y la ruta devuelve un error visible en
      // vez de dejar la interfaz en «Preparando…» indefinidamente.
      const timeoutSignal = AbortSignal.timeout(90_000);
      const signal = init.signal ? AbortSignal.any([init.signal, timeoutSignal]) : timeoutSignal;
      const response = await fetch(url, { ...init, signal });
      await recordOpenAiResponse({ feature: routeKey, model, startedAt, response });
      return response;
    },
  );
}
