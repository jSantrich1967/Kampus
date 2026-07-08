import type { CommunityContext } from "@/lib/community-types";
import type { ChannelActivityStat } from "@/lib/community/activity";
import { activitySubtitle, heatFromActivity } from "@/lib/community/activity";

export type CommunityChannelHeat = "quiet" | "active" | "hot";

export type CommunityChannel = {
  id: string;
  title: string;
  subtitle: string;
  heat: CommunityChannelHeat;
  context: CommunityContext;
  /** Placeholder channels (no exams configured, etc.) */
  disabled?: boolean;
};

export type CommunityProfileSlice = {
  subjects?: string[];
  upcomingExams?: { subject: string; date: string }[];
};

export const STUDENT_COMMUNITY_CONTEXTS: { id: CommunityContext; es: string; en: string }[] = [
  { id: "subject", es: "Materia", en: "Subject" },
  { id: "exam", es: "Examen", en: "Exam" },
];

export function subjectChannelId(subject: string): string {
  return `sub:${subject.trim()}`;
}

export function examChannelId(subject: string, date: string): string {
  return `exam:${subject.trim()}:${date.trim()}`;
}

export function buildCommunityChannelHref(channelId: string): string {
  return `/community?channel=${encodeURIComponent(channelId)}`;
}

export function buildCommunitySubjectHref(subject: string): string {
  return buildCommunityChannelHref(subjectChannelId(subject));
}

export function buildCommunityExamHref(subject: string, date: string): string {
  return buildCommunityChannelHref(examChannelId(subject, date));
}

export function heatLabel(heat: CommunityChannelHeat, es: boolean): string {
  if (heat === "hot") return es ? "Caliente" : "Hot";
  if (heat === "active") return es ? "Activo" : "Active";
  return es ? "Tranquilo" : "Quiet";
}

export function heatTone(heat: CommunityChannelHeat): "danger" | "warning" | "neutral" {
  if (heat === "hot") return "danger";
  if (heat === "active") return "warning";
  return "neutral";
}

export function buildStudentCommunityChannels(
  profile: CommunityProfileSlice,
  context: CommunityContext,
  es: boolean,
): CommunityChannel[] {
  const subjects = profile.subjects ?? [];
  const upcomingExams = profile.upcomingExams ?? [];

  if (context === "exam") {
    if (upcomingExams.length === 0) {
      return [
        {
          id: "exam:sin-examenes",
          title: es ? "Exámenes (sin fechas)" : "Exams (no dates)",
          subtitle: es
            ? "Añade fechas en Calendario o Exámenes para abrir canales por examen."
            : "Add exam dates in Calendar or Exams to open exam channels.",
          heat: "quiet",
          context: "exam",
          disabled: true,
        },
      ];
    }
    return upcomingExams.slice(0, 12).map((e) => {
      const id = examChannelId(e.subject, e.date);
      return {
        id,
        title: es ? `${e.subject} · examen` : `${e.subject} · exam`,
        subtitle: es ? `Fecha: ${e.date}` : `Date: ${e.date}`,
        heat: "quiet" as const,
        context: "exam" as const,
      };
    });
  }

  if (subjects.length === 0) {
    return [
      {
        id: "sub:general",
        title: es ? "General" : "General",
        subtitle: es
          ? "Publicaciones generales mientras configuras tus materias."
          : "General posts while you configure your subjects.",
        heat: "quiet",
        context: "subject",
      },
    ];
  }

  return subjects.slice(0, 12).map((s) => {
    const id = subjectChannelId(s);
    return {
      id,
      title: s,
      subtitle: es ? "Sala de estudio — preguntas y resúmenes" : "Study hall — questions and summaries",
      heat: "quiet" as const,
      context: "subject" as const,
    };
  });
}

/** Overlay real Supabase activity onto channel list (replaces default heat/subtitle). */
export function applyChannelActivity(
  channels: CommunityChannel[],
  activityByChannel: Record<string, ChannelActivityStat>,
  es: boolean,
): CommunityChannel[] {
  return channels.map((ch) => {
    if (ch.disabled) return ch;
    const stat = activityByChannel[ch.id];
    if (!stat) return ch;
    return {
      ...ch,
      heat: heatFromActivity(stat),
      subtitle: activitySubtitle(stat, es),
    };
  });
}

export function resolveChannelNavigation(
  profile: CommunityProfileSlice,
  channelId: string,
): { context: CommunityContext } | null {
  for (const ctx of STUDENT_COMMUNITY_CONTEXTS.map((c) => c.id)) {
    if (buildStudentCommunityChannels(profile, ctx, true).some((c) => c.id === channelId)) {
      return { context: ctx };
    }
  }
  return null;
}

export function findChannelById(
  profile: CommunityProfileSlice,
  channelId: string,
  es: boolean,
  activityByChannel?: Record<string, ChannelActivityStat>,
): CommunityChannel | null {
  for (const ctx of STUDENT_COMMUNITY_CONTEXTS.map((c) => c.id)) {
    const base = buildStudentCommunityChannels(profile, ctx, es);
    const withActivity = activityByChannel ? applyChannelActivity(base, activityByChannel, es) : base;
    const match = withActivity.find((c) => c.id === channelId);
    if (match) return match;
  }
  return null;
}

export function allStudentChannelIds(profile: CommunityProfileSlice): string[] {
  const ids: string[] = [];
  for (const ctx of STUDENT_COMMUNITY_CONTEXTS.map((c) => c.id)) {
    for (const ch of buildStudentCommunityChannels(profile, ctx, true)) {
      if (!ch.disabled) ids.push(ch.id);
    }
  }
  return ids;
}
