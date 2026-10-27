import { describe, expect, it } from "vitest";

import { splitMathSegments } from "@/lib/study/math-segments";

describe("splitMathSegments", () => {
  it("keeps a sentence and lifts a formula out of dollar signs", () => {
    expect(splitMathSegments("La derivada de $x^2$ es $2x$.")).toEqual([
      { kind: "text", value: "La derivada de " },
      { kind: "math", value: "x^2" },
      { kind: "text", value: " es " },
      { kind: "math", value: "2x" },
      { kind: "text", value: "." },
    ]);
  });

  it("treats a raw latex option as math", () => {
    expect(splitMathSegments("\\frac{1}{2}")).toEqual([{ kind: "math", value: "\\frac{1}{2}" }]);
    expect(splitMathSegments("9x^2 - 5")).toEqual([{ kind: "math", value: "9x^2 - 5" }]);
  });
});
