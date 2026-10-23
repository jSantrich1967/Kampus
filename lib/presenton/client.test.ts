import { describe, expect, it, vi } from "vitest";

import { PresentonClientError, generateWithPresenton } from "./client";
import { buildPresentonPayload } from "./payload";

// Construida por partes a propósito: no es una clave real, solo un valor de test.
const FAKE_API_KEY = ["sk", "presenton", "test"].join("-");
const config = { baseUrl: "http://localhost:5001", apiKey: FAKE_API_KEY };
const payload = buildPresentonPayload(
  { subject: "Biología", documents: [{ topic: "La célula", filename: "c.pdf", excerpt: "Texto." }] },
  { nSlides: 8, exportAs: "pptx" },
);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("generateWithPresenton", () => {
  it("posts to the documented generate endpoint with Bearer auth and maps the result", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse({
        presentation_id: "abc-123",
        path: "/app_data/exports/presentacion.pptx",
        edit_path: "/presentation?id=abc-123",
      }),
    ) as unknown as typeof fetch;

    const result = await generateWithPresenton(config, payload, fetchImpl);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://localhost:5001/api/v1/ppt/presentation/generate");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-presenton-test");
    expect(JSON.parse(String(init.body)).slides_markdown).toHaveLength(1);

    expect(result.presentationId).toBe("abc-123");
    expect(result.downloadUrl).toBe("http://localhost:5001/app_data/exports/presentacion.pptx");
    expect(result.editUrl).toBe("http://localhost:5001/presentation?id=abc-123");
  });

  it("throws PresentonClientError with the upstream status and detail on HTTP errors", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ detail: "LLM not configured" }, 500)) as unknown as typeof fetch;
    await expect(generateWithPresenton(config, payload, fetchImpl)).rejects.toMatchObject({
      name: "PresentonClientError",
      status: 500,
      message: expect.stringContaining("LLM not configured"),
    });
  });

  it("throws PresentonClientError status 0 when the service is unreachable", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("fetch failed");
    }) as unknown as typeof fetch;
    const err = await generateWithPresenton(config, payload, fetchImpl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PresentonClientError);
    expect((err as PresentonClientError).status).toBe(0);
  });

  it("throws on an unexpected success payload", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse({ ok: true })) as unknown as typeof fetch;
    await expect(generateWithPresenton(config, payload, fetchImpl)).rejects.toBeInstanceOf(PresentonClientError);
  });
});
