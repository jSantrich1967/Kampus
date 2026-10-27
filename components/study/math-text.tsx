"use client";

import katex from "katex";
import "katex/dist/katex.min.css";

import { splitMathSegments } from "@/lib/study/math-segments";

function mathHtml(value: string): string {
  return katex.renderToString(value, {
    throwOnError: false,
    strict: "ignore",
    output: "html",
  });
}

/** Shows a diagnosis line with formulas drawn, not as raw commands. */
export function MathText({ text }: { text: string }) {
  const parts = splitMathSegments(text);
  return (
    <span>
      {parts.map((part, index) =>
        part.kind === "math" ? (
          <span key={index} dangerouslySetInnerHTML={{ __html: mathHtml(part.value) }} />
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </span>
  );
}
