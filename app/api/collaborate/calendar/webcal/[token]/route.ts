import { NextResponse } from "next/server";

import { buildVirtualClassIcs } from "@/lib/calendar/virtual-class-ics";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { fetchEnrolledVirtualClassSessionsForUser, resolveWebcalUserId } from "@/lib/supabase/webcal-db";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_req: Request, context: RouteContext) {
  const { token } = await context.params;
  if (!token?.trim()) {
    return new NextResponse("Not found", { status: 404 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return new NextResponse("Service unavailable", { status: 503 });
  }

  try {
    const userId = await resolveWebcalUserId(admin, token.trim());
    if (!userId) {
      return new NextResponse("Not found", { status: 404 });
    }

    const sessions = await fetchEnrolledVirtualClassSessionsForUser(admin, userId);
    const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://kampus.app";
    const ics = buildVirtualClassIcs(
      sessions.map((s) => ({
        id: s.id,
        course: s.course,
        topic: s.topic,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        joinUrl: s.joinUrl,
      })),
      origin,
    );

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
