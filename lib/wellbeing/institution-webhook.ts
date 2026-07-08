export type InstitutionWebhookPayload = {
  event: "wellbeing.counselor_alert";
  institutionKey: string;
  weekStart: string;
  riskLevel: string;
  riskScore: number;
  reasons: string[];
  channel: "auto" | "manual";
  emittedAt: string;
};

export async function postInstitutionWellbeingWebhook(payload: InstitutionWebhookPayload): Promise<boolean> {
  const url = process.env.WELLBEING_INSTITUTION_WEBHOOK_URL?.trim();
  if (!url) return false;

  const secret = process.env.WELLBEING_INSTITUTION_WEBHOOK_SECRET?.trim();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (secret) headers.Authorization = `Bearer ${secret}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}
