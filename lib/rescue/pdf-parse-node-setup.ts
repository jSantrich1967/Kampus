import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

let polyfilled = false;

/** pdfjs-dist expects browser globals; polyfill from @napi-rs/canvas on Node/Vercel. */
export function ensurePdfParseNodeGlobals(): void {
  if (polyfilled) return;

  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = DOMMatrix as unknown as typeof globalThis.DOMMatrix;
  }
  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = ImageData as unknown as typeof globalThis.ImageData;
  }
  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = Path2D as unknown as typeof globalThis.Path2D;
  }

  polyfilled = true;
}

export async function loadPdfParseClass() {
  ensurePdfParseNodeGlobals();
  const { PDFParse } = await import("pdf-parse");
  return PDFParse;
}
