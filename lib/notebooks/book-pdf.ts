import { jsPDF } from "jspdf";

import { buildNotebookIndexGroups } from "@/lib/notebooks/notebook-index";
import { repairSpuriousAmpersandOcrText } from "@/lib/notebooks/ocr-text-repair";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(blob);
  });
}

function sanitizeExtractedText(raw: string): string {
  const text = repairSpuriousAmpersandOcrText((raw ?? "").replace(/\r\n/g, "\n")).trim();
  if (!text) return "";

  // Some extractors may leak debug-like lines (ids, model strings). Remove common patterns.
  const lines = text
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => {
      const low = l.trim().toLowerCase();
      if (!low) return true;
      if (low === "response" || low === "completed" || low === "developer") return false;
      if (low.startsWith("resp_") || low.startsWith("msg_")) return false;
      if (low.startsWith("gpt-") || low.startsWith("openai") || low.startsWith("model:")) return false;
      if (low === "output_text" || low === "assistant" || low === "in_memory" || low === "default" || low === "text" || low === "auto" || low === "disabled")
        return false;
      // Drop lines that look like broken OCR encoding / symbol soup.
      const trimmed = l.trim();
      const alphaNum = (trimmed.match(/[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ]/g) ?? []).length;
      const symbols = (trimmed.match(/[^A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ\s]/g) ?? []).length;
      if (symbols >= 8 && alphaNum <= 6) return false;
      if (/^(&-){3,}/.test(trimmed.replace(/\s+/g, ""))) return false;
      if (trimmed.includes("&&") && symbols > alphaNum * 1.5) return false;
      return true;
    });

  // Collapse huge blank gaps.
  return lines
    .join("\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function prettyClassLabelFromFilename(filename: string): string {
  const raw = (filename ?? "").trim();
  if (!raw) return "";
  const noExt = raw.replace(/\.[^.]+$/, "");
  return noExt.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function isoToEsDate(iso: string): string {
  const s = (iso ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "Sin fecha";
  return s;
}

function addWrappedText(doc: jsPDF, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottom = pageHeight - 18;

  let cursorY = y;
  for (const line of lines) {
    if (cursorY > bottom) {
      doc.addPage();
      cursorY = 20;
    }
    doc.text(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

function addImageScaled(doc: jsPDF, dataUrl: string, x: number, y: number, maxWidth: number) {
  const props = doc.getImageProperties(dataUrl);
  const pageHeight = doc.internal.pageSize.getHeight();
  const bottom = pageHeight - 18;
  const availHeight = bottom - y;

  // Keep aspect ratio; constrain to maxWidth and available height.
  const ratio = props.width > 0 ? maxWidth / props.width : 1;
  let w = maxWidth;
  let h = props.height * ratio;
  if (h > availHeight) {
    const r2 = availHeight / h;
    w = w * r2;
    h = h * r2;
  }

  // If still too small space, add new page.
  if (h < 10 || y + h > bottom) {
    doc.addPage();
    y = 20;
  }

  const format = dataUrl.startsWith("data:image/png") ? "PNG" : "JPEG";
  doc.addImage(dataUrl, format, x, y, w, h);
  return y + h;
}

/**
 * Generates a clean compiled PDF from notebook extracted text (no AI rewriting).
 * - Uses date groups (class_date or created_at date).
 * - Adds a simple index.
 * - Includes sanitized extracted_text per page.
 * - Optionally embeds images (when resolver returns a data URL).
 */
export async function generateNotebookBookPdf(args: {
  subjectLabel: string;
  pages: NotebookDocumentRow[];
  resolveImageBlob?: (page: NotebookDocumentRow) => Promise<Blob | null>;
  resolveExtractedText?: (page: NotebookDocumentRow) => Promise<string | null>;
}): Promise<Blob> {
  const subject = args.subjectLabel.trim() || "Cuaderno";
  const groups = buildNotebookIndexGroups(args.pages);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 52;
  const maxWidth = pageWidth - marginX * 2;

  // Cover
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(subject, marginX, 90);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text("Compilación del cuaderno (texto extraído)", marginX, 112);
  // Keep PDF readable on white background (default page is white).
  doc.setTextColor(25, 25, 35);

  // Index
  doc.addPage();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Índice", marginX, 60);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 86;
  for (const g of groups) {
    const first = g.items[0]?.page ?? null;
    const rawTitle = (first?.topic ?? "").trim();
    const classTitle = rawTitle || prettyClassLabelFromFilename(first?.filename ?? "") || "Clase";
    const line = `${isoToEsDate(g.dateKey)} — ${classTitle} (${g.items.length} pág.)`;
    y = addWrappedText(doc, line, marginX, y, maxWidth, 14);
    y += 2;
  }

  // Chapters
  for (const g of groups) {
    doc.addPage();
    const first = g.items[0]?.page ?? null;
    const rawTitle = (first?.topic ?? "").trim();
    const classTitle = rawTitle || prettyClassLabelFromFilename(first?.filename ?? "") || "Clase";

    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.text(`${isoToEsDate(g.dateKey)} · ${classTitle}`, marginX, 60);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);

    let cy = 84;
    for (const it of g.items) {
      const p = it.page;
      const fileLabel = prettyClassLabelFromFilename(p.filename ?? "");
      const heading = `Página ${it.index0 + 1} · ${fileLabel || p.filename || "Archivo"}`;
      doc.setFont("helvetica", "bold");
      doc.text(heading, marginX, cy);
      cy += 14;
      doc.setFont("helvetica", "normal");

      const isImage = Boolean(p.mime_type?.startsWith("image/")) || /\.(png|jpe?g|webp)$/i.test(p.filename ?? "");
      if (isImage && args.resolveImageBlob) {
        try {
          const blob = await args.resolveImageBlob(p);
          if (blob) {
            const dataUrl = await blobToDataUrl(blob);
            cy = addImageScaled(doc, dataUrl, marginX, cy, maxWidth) + 10;
            let bodyAfter = sanitizeExtractedText(p.extracted_text ?? "");
            if (args.resolveExtractedText) {
              const fresh = await args.resolveExtractedText(p);
              const cleaned = sanitizeExtractedText(fresh ?? "");
              // Prefer the fresher OCR if it looks more meaningful.
              if (cleaned && cleaned.length > bodyAfter.length) bodyAfter = cleaned;
            }
            if (bodyAfter) {
              cy = addWrappedText(doc, bodyAfter, marginX, cy, maxWidth, 13) + 10;
            }
            continue;
          }
        } catch {
          // Fall back to text-only.
        }
      }

      let body = sanitizeExtractedText(p.extracted_text ?? "");
      if (args.resolveExtractedText) {
        try {
          const fresh = await args.resolveExtractedText(p);
          const cleaned = sanitizeExtractedText(fresh ?? "");
          if (cleaned && cleaned.length > body.length) body = cleaned;
        } catch {
          // ignore
        }
      }
      if (!body) {
        cy = addWrappedText(doc, "(Sin texto extraído)", marginX, cy, maxWidth, 13) + 8;
      } else {
        cy = addWrappedText(doc, body, marginX, cy, maxWidth, 13) + 10;
      }
    }
  }

  return doc.output("blob");
}

