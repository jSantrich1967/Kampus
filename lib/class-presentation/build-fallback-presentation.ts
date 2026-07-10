import type { ClassPresentation } from "@/lib/schemas/class-presentation";

type PageHint = {
  pageNumber: number;
  filename: string;
  topic?: string;
  documentId?: string;
};

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.replace(/^#+\s*/gm, "").trim())
    .filter((p) => p.length > 40);
}

export function buildFallbackClassPresentation(
  subjectHint: string,
  extractedText: string,
  pageHints: PageHint[],
): ClassPresentation {
  const chunks = splitParagraphs(extractedText);
  const subjectLine = subjectHint.trim() || "Clase visual";
  const intro =
    chunks.length > 0
      ? "Repasamos tus apuntes en formato de clase visual. Cada diapositiva resume una parte del material que elegiste."
      : "No hay mucho texto extraído todavía. Te mostramos una guía breve para repasar lo que subiste.";

  const slideSources =
    pageHints.length > 0
      ? pageHints
      : [{ pageNumber: 1, filename: "Apunte", topic: subjectLine }];

  const slideCount = Math.min(8, Math.max(3, chunks.length || slideSources.length));
  const slides = Array.from({ length: slideCount }, (_, i) => {
    const source = slideSources[i % slideSources.length]!;
    const chunk = chunks[i] ?? chunks[chunks.length - 1] ?? source.topic ?? source.filename;
    const lines = chunk
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 4);
    const title = source.topic?.trim() || `Parte ${i + 1}`;
    const bullets =
      lines.length > 0
        ? lines.map((l) => (l.length > 120 ? `${l.slice(0, 117)}…` : l))
        : [`Revisa la hoja ${source.pageNumber} con calma y subraya lo esencial.`];

    return {
      id: `slide-${i + 1}`,
      title,
      narration: `En esta parte hablamos de ${title}. ${bullets[0] ?? "Repasa el apunte original al lado."}`,
      bullets: bullets.slice(0, 4),
      diagram: {
        type: "flow" as const,
        items: bullets.slice(0, 3).map((label, idx) => ({
          label: `Paso ${idx + 1}`,
          detail: label,
        })),
      },
      sourcePageNumber: source.pageNumber,
      sourceDocumentId: source.documentId,
      sourceFilename: source.filename,
    };
  });

  return { subjectLine, intro, slides };
}
