import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  user: null as { id: string } | null,
  notebook: null as { id: string; subject: string } | null,
  documents: [] as Array<{ topic: string | null; lesson_point: string | null; filename: string; extracted_text: string | null }>,
  quotaOk: true,
  refundCalls: 0,
  consumeCalls: 0,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.user } }),
    },
    from: (table: string) => {
      if (table === "user_notebooks") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: state.notebook, error: null }),
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: state.documents, error: null }),
              }),
            }),
          }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/rate-limit/user-quota", () => ({
  consumeDailyUserQuota: async () => {
    state.consumeCalls += 1;
    return state.quotaOk
      ? { ok: true, used: 1, limit: 5, resetAtIso: new Date().toISOString() }
      : { ok: false, status: 429, message: "Has alcanzado el límite diario de uso de IA. Vuelve a intentarlo mañana." };
  },
  refundDailyUserQuotaForCurrentUser: async () => {
    state.refundCalls += 1;
  },
}));

import { POST } from "@/app/api/presenton/generate/route";

function callGenerate(body: unknown) {
  return POST(
    new Request("http://localhost/api/presenton/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function enablePilot() {
  vi.stubEnv("NEXT_PUBLIC_PRESENTON_PILOT_ENABLED", "true");
  vi.stubEnv("PRESENTON_API_URL", "http://localhost:5001");
  vi.stubEnv("PRESENTON_API_KEY", ["sk", "presenton", "test"].join("-"));
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");
}

beforeEach(() => {
  state.user = { id: "user-1" };
  state.notebook = { id: "nb-1", subject: "Biología" };
  state.documents = [
    { topic: "La célula", lesson_point: null, filename: "celula.pdf", extracted_text: "La célula es la unidad básica de la vida." },
  ];
  state.quotaOk = true;
  state.refundCalls = 0;
  state.consumeCalls = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("POST /api/presenton/generate", () => {
  it("returns 503 when the pilot flag is off, without consuming quota", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRESENTON_PILOT_ENABLED", "false");
    vi.stubEnv("PRESENTON_API_URL", "http://localhost:5001");
    const res = await callGenerate({ subject: "Biología" });
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.code).toBe("PRESENTON_NOT_CONFIGURED");
    expect(state.consumeCalls).toBe(0);
  });

  it("returns 503 when PRESENTON_API_URL is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_PRESENTON_PILOT_ENABLED", "true");
    vi.stubEnv("PRESENTON_API_URL", "");
    const res = await callGenerate({ subject: "Biología" });
    expect(res.status).toBe(503);
    expect(state.consumeCalls).toBe(0);
  });

  it("rejects unauthenticated users with 401", async () => {
    enablePilot();
    state.user = null;
    const res = await callGenerate({ subject: "Biología" });
    expect(res.status).toBe(401);
    expect(state.consumeCalls).toBe(0);
  });

  it("generates from the user's own notebook and returns download/edit URLs", async () => {
    enablePilot();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          presentation_id: "p-1",
          path: "/app_data/exports/biologia.pptx",
          edit_path: "/presentation?id=p-1",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    const res = await callGenerate({ subject: "Biología", nSlides: 8, exportAs: "pptx" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.presentationId).toBe("p-1");
    expect(body.downloadUrl).toBe("http://localhost:5001/app_data/exports/biologia.pptx");
    expect(body.editUrl).toBe("http://localhost:5001/presentation?id=p-1");
    expect(state.consumeCalls).toBe(1);
    expect(state.refundCalls).toBe(0);

    const [url, init] = fetchSpy.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("http://localhost:5001/api/v1/ppt/presentation/generate");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-presenton-test");
    const sent = JSON.parse(String(init.body));
    expect(sent.slides_markdown[0]).toContain("# La célula");
    expect(sent.language).toBe("Spanish");
  });

  it("returns 404 and refunds when the notebook is not the user's", async () => {
    enablePilot();
    state.notebook = null;
    const res = await callGenerate({ subject: "Biología" });
    expect(res.status).toBe(404);
    expect(state.refundCalls).toBe(1);
  });

  it("returns 502 and refunds when Presenton fails", async () => {
    enablePilot();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ detail: "boom" }), { status: 500, headers: { "Content-Type": "application/json" } }),
    );
    const res = await callGenerate({ subject: "Biología" });
    expect(res.status).toBe(502);
    expect(state.refundCalls).toBe(1);
  });
});
