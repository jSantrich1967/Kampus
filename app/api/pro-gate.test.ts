import { afterEach, describe, expect, it, vi } from "vitest";

const session = vi.hoisted(() => ({
  user: null as { id: string } | null,
  entitlement: null as { plan: string; expires_at: string } | null,
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: async () => ({
    auth: {
      getUser: async () => ({ data: { user: session.user } }),
    },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: table === "billing_entitlements" ? session.entitlement : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

import { POST as tutorPost } from "@/app/api/tutor/chat/route";
import { POST as diagnosePost } from "@/app/api/cram/diagnose/route";

function call(handler: (req: Request) => Promise<Response>, path: string) {
  return handler(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-forwarded-for": `10.9.${Math.floor(Math.random() * 200)}.${Math.floor(Math.random() * 200)}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: "¿Qué es una fracción?" }],
        subject: "Matemática",
        topics: "fracciones",
      }),
    }),
  );
}

afterEach(() => {
  session.user = null;
  session.entitlement = null;
  vi.restoreAllMocks();
});

describe("a signed-in free account", () => {
  it("is stopped at the tutor before any model call", async () => {
    session.user = { id: "free-student" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("openai should not be called"));

    const res = await call(tutorPost, "/api/tutor/chat");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("PRO_REQUIRED");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is stopped at exam diagnosis before any model call", async () => {
    session.user = { id: "free-student" };
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("openai should not be called"));

    const res = await call(diagnosePost, "/api/cram/diagnose");
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.code).toBe("PRO_REQUIRED");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("stays free when the Pro period has already ended", async () => {
    session.user = { id: "expired-student" };
    session.entitlement = { plan: "premium", expires_at: "2020-01-01T00:00:00.000Z" };
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("openai should not be called"));

    const res = await call(tutorPost, "/api/tutor/chat");
    expect(res.status).toBe(403);
    expect((await res.json()).code).toBe("PRO_REQUIRED");
  });
});
