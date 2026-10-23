import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  quota: { ok: true, used: 1, limit: 30 } as
    | { ok: true; used: number; limit: number }
    | { ok: false; status: 401 | 429; message: string; retryAfterSec?: number },
  handlerCalls: 0,
}));

vi.mock("@/lib/supabase/env", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({
        data: { user: state.user },
        error: state.user ? null : new Error("no session"),
      }),
    },
  }),
}));

vi.mock("@/lib/rate-limit/user-quota", () => ({
  consumeDailyUserQuota: async () => state.quota,
  refundDailyUserQuotaForCurrentUser: async () => undefined,
}));

vi.mock("@copilotkit/runtime", () => ({
  CopilotRuntime: class CopilotRuntime {},
  OpenAIAdapter: class OpenAIAdapter {},
  copilotRuntimeNextJSAppRouterEndpoint: () => ({
    handleRequest: async () => {
      state.handlerCalls += 1;
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  }),
}));

vi.mock("openai", () => ({ default: class OpenAI {} }));

import { GET, POST } from "./route";

function postCopilot() {
  return POST(
    new Request("http://localhost/api/copilotkit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    }),
  );
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED = "true";
  process.env.OPENAI_API_KEY = "sk-test";
  state.user = { id: "student-1" };
  state.quota = { ok: true, used: 1, limit: 30 };
  state.handlerCalls = 0;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED;
  delete process.env.OPENAI_API_KEY;
  vi.restoreAllMocks();
});

describe("/api/copilotkit (piloto)", () => {
  it("devuelve 404 con la bandera apagada, aunque haya sesión", async () => {
    delete process.env.NEXT_PUBLIC_COPILOT_PILOT_ENABLED;
    const res = await postCopilot();
    expect(res.status).toBe(404);
    expect(state.handlerCalls).toBe(0);
  });

  it("rechaza 401 sin sesión y nunca llega al runtime (sin acceso anónimo al LLM)", async () => {
    state.user = null;
    const res = await postCopilot();
    expect(res.status).toBe(401);
    expect(state.handlerCalls).toBe(0);
  });

  it("rechaza 401 en GET sin sesión", async () => {
    state.user = null;
    const res = await GET(new Request("http://localhost/api/copilotkit"));
    expect(res.status).toBe(401);
    expect(state.handlerCalls).toBe(0);
  });

  it("propaga el 429 de la cuota existente (consume_api_quota) sin llamar al modelo", async () => {
    state.quota = {
      ok: false,
      status: 429,
      message: "Has alcanzado el límite diario de uso de IA. Vuelve a intentarlo mañana.",
      retryAfterSec: 3600,
    };
    const res = await postCopilot();
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("3600");
    expect(state.handlerCalls).toBe(0);
  });

  it("con sesión y cuota disponible, delega en el runtime de CopilotKit", async () => {
    const res = await postCopilot();
    expect(res.status).toBe(200);
    expect(state.handlerCalls).toBe(1);
  });
});
