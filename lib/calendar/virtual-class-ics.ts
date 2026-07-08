import { buildVirtualSessionHref } from "@/lib/collaborate/virtual-session-path";

export type IcsVirtualClassSession = {
  id: string;
  course: string;
  topic?: string;
  startsAt: string;
  endsAt?: string | null;
  joinUrl?: string | null;
};

function escapeIcs(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function toIcsUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

export function buildVirtualClassIcs(sessions: IcsVirtualClassSession[], origin: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Kampus//Colaboracion//ES",
    "CALSCALE:GREGORIAN",
  ];

  for (const session of sessions) {
    const start = toIcsUtc(session.startsAt);
    const endIso = session.endsAt ?? new Date(new Date(session.startsAt).getTime() + 60 * 60 * 1000).toISOString();
    const end = toIcsUtc(endIso);
    const href = `${origin.replace(/\/$/, "")}${buildVirtualSessionHref(session.id)}`;
    const descriptionParts = [session.topic?.trim(), session.joinUrl?.trim()].filter(Boolean);

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:virtualClass:${session.id}@kampus.app`);
    lines.push(`DTSTAMP:${toIcsUtc(new Date().toISOString())}`);
    lines.push(`DTSTART:${start}`);
    lines.push(`DTEND:${end}`);
    lines.push(`SUMMARY:${escapeIcs(session.course)}`);
    if (descriptionParts.length > 0) {
      lines.push(`DESCRIPTION:${escapeIcs(descriptionParts.join("\n"))}`);
    }
    lines.push(`URL:${href}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function defaultVirtualClassIcsFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `kampus-clases-virtuales-${stamp}.ics`;
}
