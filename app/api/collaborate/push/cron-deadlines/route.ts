import { NextResponse } from "next/server";

import { buildDeadlinePushPayload, focusItemsFromWorksAndPresentations } from "@/lib/collaborate/deadline-push-cron";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  listDeadlinePushOptInUserIds,
  markDeadlinePushSent,
  wasDeadlinePushSentToday,
} from "@/lib/supabase/collaborate-push-db";
import { fetchPresentationDeckSummariesRemote, fetchStudentWorksRemote } from "@/lib/supabase/agenda-db";
import { listWellbeingPushSubscriptionsForUser } from "@/lib/supabase/wellbeing-push-db";
import { broadcastCheckInPush } from "@/lib/wellbeing/web-push-server";
import { getVapidPublicKey } from "@/lib/wellbeing/web-push-env";

export const runtime = "nodejs";

function authorizeCron(req: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorizeCron(req)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!getVapidPublicKey()) {
    return NextResponse.json({ error: "VAPID not configured." }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "Service role not configured." }, { status: 503 });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const userIds = await listDeadlinePushOptInUserIds(admin);

    for (const userId of userIds) {
      if (await wasDeadlinePushSentToday(admin, userId)) {
        skipped += 1;
        continue;
      }

      const [works, presentations] = await Promise.all([
        fetchStudentWorksRemote(admin, userId),
        fetchPresentationDeckSummariesRemote(admin, userId),
      ]);
      const items = focusItemsFromWorksAndPresentations(works, presentations);
      const payload = buildDeadlinePushPayload(items);
      if (!payload) {
        skipped += 1;
        continue;
      }

      const subs = await listWellbeingPushSubscriptionsForUser(admin, userId);
      if (subs.length === 0) {
        skipped += 1;
        continue;
      }

      const result = await broadcastCheckInPush(subs, payload.title, payload.body, payload.url);
      if (result.sent > 0) {
        await markDeadlinePushSent(admin, userId);
        sent += 1;
      } else {
        failed += 1;
      }
    }

    return NextResponse.json({ ok: true, sent, skipped, failed, users: userIds.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cron deadline push failed." },
      { status: 500 },
    );
  }
}
