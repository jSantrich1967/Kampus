import { jsPDF } from "jspdf";

import { buildNotebookIndexGroups } from "@/lib/notebooks/notebook-index";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";

function sanitizeExtractedText(raw: string): string {
  const text = (raw ?? "").replace(/\r\n/g, "\n").trim();
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
      return true;
    });

  return lines.join("\n").trim();
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

/**
 * Generates a clean compiled PDF from notebook extracted text (no AI rewriting).
 * - Uses date groups (class_date or created_at date).
 * - Adds a simple index.
 * - Includes sanitized extracted_text per page.
 */
export function generateNotebookBookPdf(args: { subjectLabel: string; pages: NotebookDocumentRow[] }): Blob {
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
  doc.setDrawColor(255, 255, 255);
  doc.setTextColor(210, 210, 220);
  doc.setTextColor(255, 255, 255);

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
      const body = sanitizeExtractedText(p.extracted_text ?? "");
      if (!body) {
        cy = addWrappedText(doc, "(Sin texto extraído)", marginX, cy, maxWidth, 13) + 8;
      } else {
        cy = addWrappedText(doc, body, marginX, cy, maxWidth, 13) + 10;
      }
    }
  }

  return doc.output("blob");
}

