import { NextResponse } from "next/server";

import { getVapidPublicKey } from "@/lib/wellbeing/web-push-env";

export const runtime = "nodejs";

export async function GET() {
  const publicKey = getVapidPublicKey();
  if (!publicKey) {
    return NextResponse.json({ configured: false, publicKey: null }, { status: 503 });
  }
  return NextResponse.json({ configured: true, publicKey });
}
