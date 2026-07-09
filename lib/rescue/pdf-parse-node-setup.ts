import { DOMMatrix, ImageData, Path2D } from "@napi-rs/canvas";

let polyfilled = false;
let workerConfigured = false;

const PDF_PARSE_VERSION = "2.4.5";

function pdfWorkerSrc(): string {
  const fromEnv = process.env.PDF_PARSE_WORKER_URL?.trim();
  if (fromEnv) return fromEnv;
  // Vercel/Next bundles omit pdf.worker.mjs — load from CDN (pdf-parse README).
  return `https://cdn.jsdelivr.net/npm/pdf-parse@${PDF_PARSE_VERSION}/dist/pdf-parse/esm/pdf.worker.mjs`;
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
