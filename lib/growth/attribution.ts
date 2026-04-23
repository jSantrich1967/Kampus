import type { ShareCampaign } from "@/lib/growth/share-links";

export function parseShareAttribution(searchParams: URLSearchParams): {
  isKampusShare: boolean;
  campaign: ShareCampaign | null;
  ref: string | null;
} {
  const source = searchParams.get("utm_source");
  const medium = searchParams.get("utm_medium");
  const raw = searchParams.get("utm_campaign");
  const ref = searchParams.get("ref");
  const isKampusShare = source === "kampus" && medium === "share" && !!raw;
  const allowed: ShareCampaign[] = [
    "today_digest",
    "pass_mode",
    "rescue_pack",
    "quiz_deck",
    "community_invite",
    "study_room",
    "presentation_team",
    "academic_radar",
    "ai_library",
    "exam_workflow",
    "teacher_workflow",
  ];
  const campaign = allowed.includes(raw as ShareCampaign) ? (raw as ShareCampaign) : null;
  return { isKampusShare: isKampusShare && !!campaign, campaign, ref };
}

export function attributionDismissKey(campaign: ShareCampaign, ref: string | null) {
  return `kampus.share.dismiss:${campaign}:${ref ?? "none"}`;
}
