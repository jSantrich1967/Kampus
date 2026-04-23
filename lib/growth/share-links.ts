/**
 * Growth / viral links — UTM-style params for attribution until analytics backend exists.
 */

export type ShareCampaign =
  | "today_digest"
  | "pass_mode"
  | "rescue_pack"
  | "quiz_deck"
  | "community_invite"
  | "study_room"
  | "presentation_team"
  | "academic_radar"
  | "ai_library"
  | "exam_workflow"
  | "teacher_workflow";

export function buildGrowthShareUrl(
  origin: string,
  opts: {
    pathname: string;
    campaign: ShareCampaign;
    /** Extra query pairs (e.g. subject=Calculus) */
    extra?: Record<string, string | undefined>;
    /** Referrer handle — use anonymous id from profile later */
    ref?: string;
  },
): string {
  const url = new URL(opts.pathname, origin);
  const params = new URLSearchParams(url.search);
  for (const [k, v] of Object.entries(opts.extra ?? {})) {
    if (v) params.set(k, v);
  }
  params.set("utm_source", "kampus");
  params.set("utm_medium", "share");
  params.set("utm_campaign", opts.campaign);
  if (opts.ref) params.set("ref", opts.ref);
  url.search = params.toString();
  return url.toString();
}
