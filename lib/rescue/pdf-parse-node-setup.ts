import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";
// Must load before "pdf-parse" (see pdf-parse docs/troubleshooting.md).
import { CanvasFactory, getData } from "pdf-parse/worker";

let polyfilled = false;
let workerConfigured = false;

export { CanvasFactory };

function pdfWorkerSrc(): string {
  const fromEnv = process.env.PDF_PARSE_WORKER_URL?.trim();
  if (fromEnv) return fromEnv;
  // data: URL works in Node ESM dynamic import; file path needs pdf-parse external on Vercel.
  return getData();
}

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
  if (!workerConfigured) {
    PDFParse.setWorker(pdfWorkerSrc());
    workerConfigured = true;
  }
  return PDFParse;
}
