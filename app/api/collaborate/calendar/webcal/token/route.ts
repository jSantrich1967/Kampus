import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { buildWebcalFeedUrl, buildWebcalSubscribeUrl, ensureWebcalToken, rotateWebcalToken } from "@/lib/supabase/webcal-db";

export const runtime = "nodejs";

function originFromRequest(req: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3002";
}

export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Inicia sesión para obtener el feed webcal." }, { status: 401 });
  }

  try {
    const token = await ensureWebcalToken(supabase, user.id);
    const origin = originFromRequest(req);
    return NextResponse.json({
      token,
      feedUrl: buildWebcalFeedUrl(origin, token),
      subscribeUrl: buildWebcalSubscribeUrl(origin, token),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo generar el token webcal." },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userErr,
  } = await supabase.auth.getUser();

  if (userErr || !user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  try {
    const token = await rotateWebcalToken(supabase, user.id);
    const origin = originFromRequest(req);
    return NextResponse.json({
      token,
      feedUrl: buildWebcalFeedUrl(origin, token),
      subscribeUrl: buildWebcalSubscribeUrl(origin, token),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "No se pudo rotar el token." },
      { status: 500 },
    );
  }
}
