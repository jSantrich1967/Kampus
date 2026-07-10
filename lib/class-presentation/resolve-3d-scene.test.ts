import { describe, expect, it } from "vitest";

import { resolve3dScene } from "@/lib/class-presentation/resolve-3d-scene";
import type { ClassPresentationSlide } from "@/lib/schemas/class-presentation";

function slide(partial: Partial<ClassPresentationSlide>): ClassPresentationSlide {
  return {
    id: "s1",
    title: "Tema",
    narration: "Texto",
    bullets: ["Punto uno", "Punto dos"],
    ...partial,
  };
}

describe("resolve3dScene", () => {
  it("detects cell-themed slides", () => {
    expect(resolve3dScene(slide({ title: "Introducción a la célula" }), "Biología")).toBe("cell");
    expect(resolve3dScene(slide({ bullets: ["La mitocondria produce ATP"] }), "Bio")).toBe("cell");
  });

  it("returns null for unrelated topics", () => {
    expect(resolve3dScene(slide({ title: "Revolución francesa" }), "Historia")).toBeNull();
  });
});
