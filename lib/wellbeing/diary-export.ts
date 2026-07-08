import { jsPDF } from "jspdf";

import { addDaysLocalIso, localIsoDate } from "@/lib/calendar/local-iso-date";
import type { DiaryEntry, DiaryMood } from "@/lib/schemas/diary-entry";

export type DiaryExportRange = 7 | 14 | 30 | "all";

const MOOD_LABEL: Record<DiaryMood, string> = {
  heavy: "Muy bajo",
  low: "Bajo",
  neutral: "Regular",
  light: "Bien",
  bright: "Muy bien",
};

function filterByRange(entries: DiaryEntry[], range: DiaryExportRange): DiaryEntry[] {
  if (range === "all") return [...entries];
  const start = addDaysLocalIso(-(range - 1));
  const end = localIsoDate();
  return entries.filter((e) => e.entryDate >= start && e.entryDate <= end);
}

function formatDateEs(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, m! - 1, d!).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function addWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  const bottom = doc.internal.pageSize.getHeight() - 18;
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

function entryBlock(e: DiaryEntry): string {
  const gratitude =
    e.gratitude.filter(Boolean).length > 0
      ? e.gratitude.filter(Boolean).map((g, i) => `${i + 1}. ${g}`).join("\n")
      : "(sin gratitud registrada)";
  return [
    `Fecha: ${formatDateEs(e.entryDate)}`,
    `Ánimo: ${MOOD_LABEL[e.mood]} · Energía: ${e.energy}/5`,
    e.moment ? `Momento del día: ${e.moment}` : null,
    "",
    "Gratitud:",
    gratitude,
    "",
    "Reflexión:",
    e.body.trim() || "(vacío)",
    "",
    "Intención para mañana:",
    e.intention.trim() || "(vacío)",
    e.tags.length ? `\nEtiquetas: ${e.tags.join(", ")}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");
}

export function diaryEntriesForExport(entries: DiaryEntry[], range: DiaryExportRange): DiaryEntry[] {
  return filterByRange(entries, range).sort((a, b) => b.entryDate.localeCompare(a.entryDate));
}

export async function exportDiaryToPdf(
  entries: DiaryEntry[],
  range: DiaryExportRange,
  ownerLabel?: string,
): Promise<void> {
  const filtered = diaryEntriesForExport(entries, range);
  if (filtered.length === 0) {
    throw new Error("empty");
  }

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const maxWidth = pageWidth - margin * 2;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Mi Diario — Kampus", margin, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const rangeLabel =
    range === "all" ? "Todas las entradas guardadas" : `Últimos ${range} días · ${filtered.length} entrada(s)`;
  let y = addWrapped(doc, rangeLabel, margin, 30, maxWidth, 5);
  if (ownerLabel?.trim()) {
    y = addWrapped(doc, `Perfil: ${ownerLabel.trim()}`, margin, y + 2, maxWidth, 5);
  }
  y = addWrapped(doc, `Exportado: ${new Date().toLocaleString("es-ES")}`, margin, y + 2, maxWidth, 5);
  y += 8;

  doc.setDrawColor(180, 180, 180);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  for (let i = 0; i < filtered.length; i += 1) {
    if (i > 0) {
      if (y > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        y = 20;
      }
      y += 4;
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Entrada ${i + 1}`, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y = addWrapped(doc, entryBlock(filtered[i]!), margin, y, maxWidth, 5);
    y += 4;
  }

  const suffix = range === "all" ? "completo" : `${range}d`;
  doc.save(`kampus-diario-${suffix}-${localIsoDate()}.pdf`);
}
