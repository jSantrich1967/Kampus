import type { ClassPresentationSlide } from "@/lib/schemas/class-presentation";

export type Slide3dSceneType = "cell";

const CELL_PATTERN =
  /\b(c[eé]lula|celular|citolog[ií]a|org[aá]nelo|n[uú]cleo|mitocondria|membrana|citoplasma|procariota|eucariota)\b/i;

export function resolve3dScene(slide: ClassPresentationSlide, subjectLine: string): Slide3dSceneType | null {
  const haystack = [
    subjectLine,
    slide.title,
    slide.illustrationPrompt ?? "",
    slide.narration,
    ...slide.bullets,
    ...(slide.diagram?.items.map((item) => `${item.label} ${item.detail ?? ""}`) ?? []),
  ].join(" ");

  if (CELL_PATTERN.test(haystack)) return "cell";
  return null;
}
