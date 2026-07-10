import type { ClassPresentation } from "@/lib/schemas/class-presentation";
import type { SlideAccent, SlideVisualIcon } from "@/lib/schemas/class-presentation";

type PageHint = {
  pageNumber: number;
  filename: string;
  topic?: string;
  documentId?: string;
};

const ACCENTS: SlideAccent[] = ["violet", "cyan", "amber", "emerald", "rose"];
const ICONS: SlideVisualIcon[] = ["lightbulb", "book-open", "chart-line", "brain", "target", "sparkles"];

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
      ? "Bienvenido a tu clase visual. Vamos a recorrer tus apuntes paso a paso, con explicaciones claras y un mapa para que todo encaje."
      : "Todavía hay poco texto extraído de tus archivos. Te guiamos con una estructura básica para que repases lo que subiste.";
  const outro = "Repasa las ideas clave y vuelve al apunte original si algo no queda claro. ¡Buen estudio!";

  const slideSources =
    pageHints.length > 0
      ? pageHints
      : [{ pageNumber: 1, filename: "Apunte", topic: subjectLine }];

  const slideCount = Math.min(8, Math.max(4, chunks.length || slideSources.length));
  const slides = Array.from({ length: slideCount }, (_, i) => {
    const source = slideSources[i % slideSources.length]!;
    const chunk = chunks[i] ?? chunks[chunks.length - 1] ?? source.topic ?? source.filename;
    const lines = chunk
      .split(/\n/)
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 5);
    const title = source.topic?.trim() || `Bloque ${i + 1}`;
    const bullets =
      lines.length >= 2
        ? lines.map((l) => (l.length > 120 ? `${l.slice(0, 117)}…` : l)).slice(0, 4)
        : [
            `Concepto principal de la hoja ${source.pageNumber}.`,
            "Relaciónalo con lo que viste en clase y con ejemplos del temario.",
          ];

    const highlightQuote = bullets[0]!.length > 80 ? `${bullets[0]!.slice(0, 77)}…` : bullets[0]!;

    const diagramTypes = ["concept", "flow", "list"] as const;
    const diagramType = diagramTypes[i % 3]!;
    const illustrationPrompt = `Educational scene about ${title}, abstract symbols and charts, no text`;
    const mermaidCode =
      i % 2 === 0
        ? `flowchart TD\n  A["${title.slice(0, 40).replace(/"/g, "'")}"] --> B["${bullets[0]?.slice(0, 40).replace(/"/g, "'") ?? "Idea"}"]\n  B --> C["${bullets[1]?.slice(0, 40).replace(/"/g, "'") ?? "Detalle"}"]`
        : undefined;

    return {
      id: `slide-${i + 1}`,
      title,
      narration: `Vamos con ${title}. ${bullets[0] ?? "Fíjate en el apunte de la derecha mientras repasamos."}`,
      bullets,
      highlightQuote,
      visualIcon: ICONS[i % ICONS.length],
      accent: ACCENTS[i % ACCENTS.length],
      illustrationPrompt,
      mermaidCode,
      diagram: {
        type: diagramType,
        items: bullets.slice(0, 3).map((label, idx) => ({
          label: idx === 0 ? "Idea clave" : `Punto ${idx + 1}`,
          detail: label,
        })),
      },
      sourcePageNumber: source.pageNumber,
      sourceDocumentId: source.documentId,
      sourceFilename: source.filename,
    };
  });

  return { subjectLine, intro, outro, slides };
}
