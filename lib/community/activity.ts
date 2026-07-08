import type { CommunityChannelHeat } from "@/lib/community/channels";

export type ChannelActivityStat = {
  postsLast7d: number;
  answersLast7d: number;
};

/** Real activity from Supabase counts (last 7 days). */
export function heatFromActivity(stat: ChannelActivityStat | undefined): CommunityChannelHeat {
  const posts = stat?.postsLast7d ?? 0;
  const answers = stat?.answersLast7d ?? 0;
  const score = posts + answers * 0.5;
  if (score >= 4) return "hot";
  if (score >= 1) return "active";
  return "quiet";
}

export function activitySubtitle(stat: ChannelActivityStat | undefined, es: boolean): string {
  const posts = stat?.postsLast7d ?? 0;
  const answers = stat?.answersLast7d ?? 0;
  if (posts === 0 && answers === 0) {
    return es ? "Sin actividad esta semana" : "No activity this week";
  }
  if (es) {
    return `${posts} post${posts === 1 ? "" : "s"} · ${answers} respuesta${answers === 1 ? "" : "s"} (7 días)`;
  }
  return `${posts} post${posts === 1 ? "" : "s"} · ${answers} answer${answers === 1 ? "" : "s"} (7d)`;
}

export function weekAgoIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString();
}
