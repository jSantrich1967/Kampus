import { describe, expect, it } from "vitest";

import { buildPresentonPayload } from "./payload";

describe("buildPresentonPayload", () => {
  it("uses slides_markdown with one slide per notebook topic", () => {
    const payload = buildPresentonPayload(
      {
        subject: "Biología",
        documents: [
          { topic: "La célula", filename: "celula.pdf", excerpt: "La célula es la unidad básica de la vida." },
          { topic: "Fotosíntesis", filename: "foto.pdf", excerpt: "Proceso por el cual las plantas producen energía." },
        ],
      },
      { nSlides: 8, exportAs: "pptx" },
    );

    expect(payload.content).toBe("");
    expect(payload.slides_markdown).toHaveLength(2);
    expect(payload.slides_markdown?.[0]).toContain("# La célula");
    expect(payload.slides_markdown?.[0]).toContain("unidad básica");
    expect(payload.slides_markdown?.[1]).toContain("# Fotosíntesis");
    expect(payload.n_slides).toBe(2);
    expect(payload.language).toBe("Spanish");
    expect(payload.template).toBe("general");
    expect(payload.tone).toBe("educational");
    expect(payload.export_as).toBe("pptx");
    expect(payload.instructions).toContain("únicamente el contenido del cuaderno");
  });

  it("caps the number of slides at the requested count", () => {
    const docs = Array.from({ length: 12 }, (_, i) => ({
      topic: `Tema ${i + 1}`,
      filename: `t${i}.pdf`,
      excerpt: "Contenido del tema.",
    }));
    const payload = buildPresentonPayload({ subject: "Historia", documents: docs }, { nSlides: 5, exportAs: "pdf" });
    expect(payload.slides_markdown).toHaveLength(5);
    expect(payload.n_slides).toBe(5);
    expect(payload.export_as).toBe("pdf");
  });

  it("clips each slide to at most 95 words (Presenton truncates at 100 by default)", () => {
    const longExcerpt = Array.from({ length: 200 }, (_, i) => `palabra${i}`).join(" ");
    const payload = buildPresentonPayload(
      { subject: "Lengua", documents: [{ topic: "Tema largo", filename: "l.pdf", excerpt: longExcerpt }] },
      { nSlides: 8, exportAs: "pptx" },
    );
    const body = payload.slides_markdown?.[0].replace("# Tema largo", "").trim() ?? "";
    expect(body.split(/\s+/).length).toBeLessThanOrEqual(95);
  });

  it("falls back to content mode when the notebook has no usable documents", () => {
    const payload = buildPresentonPayload({ subject: "Química", documents: [] }, { nSlides: 6, exportAs: "pptx" });
    expect(payload.slides_markdown).toBeNull();
    expect(payload.content).toContain("Química");
    expect(payload.n_slides).toBe(6);
  });
});
