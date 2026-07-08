import webpush from "web-push";

import { configureWebPush } from "@/lib/wellbeing/web-push-env";

export type PushSubscriptionRow = {
  endpoint: string;
  p256dh: string;
  auth_key: string;
};

export type PushSendResult = {
  sent: number;
  failed: number;
  goneEndpoints: string[];
};

export async function sendWebPushToSubscription(
  row: PushSubscriptionRow,
  payload: { title: string; body: string; url: string },
): Promise<"ok" | "gone" | "error"> {
  if (!configureWebPush()) return "error";

  try {
    await webpush.sendNotification(
      {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth_key },
      },
      JSON.stringify(payload),
    );
    return "ok";
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    return "error";
  }
}

export async function broadcastCheckInPush(
  rows: PushSubscriptionRow[],
  title: string,
  body: string,
  url = "/wellbeing/diary",
): Promise<PushSendResult> {
  let sent = 0;
  let failed = 0;
  const goneEndpoints: string[] = [];

  for (const row of rows) {
    const result = await sendWebPushToSubscription(row, { title, body, url });
    if (result === "ok") sent += 1;
    else if (result === "gone") goneEndpoints.push(row.endpoint);
    else failed += 1;
  }

  return { sent, failed, goneEndpoints };
}
