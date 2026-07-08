import type { InstitutionPulseWeekTrend } from "@/lib/supabase/wellbeing-institution-db";

export function institutionPulseTrendsToCsv(
  institutionKey: string,
  trends: InstitutionPulseWeekTrend[],
): string {
  const header = "week_start,sample_size,avg_entries_7d,avg_energy_7d,watch_count,elevated_count";
  const rows = trends.map((w) =>
    [
      w.weekStart,
      w.sampleSize,
      w.avgEntries7d ?? "",
      w.avgEnergy7d ?? "",
      w.watchCount,
      w.elevatedCount,
    ].join(","),
  );
  return [`# institution_key=${institutionKey}`, `# exported=${new Date().toISOString()}`, header, ...rows].join("\n");
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
