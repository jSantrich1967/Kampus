export const COMMUNITY_REPORT_REASONS = [
  { id: "spam", es: "Spam o publicidad", en: "Spam or advertising" },
  { id: "off_topic", es: "Fuera de tema", en: "Off topic" },
  { id: "harassment", es: "Acoso o lenguaje inapropiado", en: "Harassment or inappropriate language" },
  { id: "other", es: "Otro", en: "Other" },
] as const;

export type CommunityReportReasonId = (typeof COMMUNITY_REPORT_REASONS)[number]["id"];
