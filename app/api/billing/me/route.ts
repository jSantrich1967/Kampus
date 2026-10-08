import { NextResponse } from "next/server";

import { PRO_PRICE_USD } from "@/lib/billing/payment-info";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export type BillingStatus = {
  priceUsd: number;
  active: boolean;
  expiresAt: string | null;
  pending: { id: string; method: string; reference: string; reportedAt: string } | null;
};

/** GET: estado Pro del usuario autenticado (fuente: pro_subscriptions). */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const nowIso = new Date().toISOString();
  const { data: actives } = await supabase
    .from("pro_subscriptions")
    .select("expires_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .gt("expires_at", nowIso)
    .order("expires_at", { ascending: false })
    .limit(1);
  const activeRow = (actives ?? [])[0] as { expires_at: string } | undefined;

  const { data: pendings } = await supabase
    .from("pro_subscriptions")
    .select("id, method, reference, reported_at")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .order("reported_at", { ascending: false })
    .limit(1);
  const pendingRow = (pendings ?? [])[0] as
    | { id: string; method: string; reference: string; reported_at: string }
    | undefined;

  const body: BillingStatus = {
    priceUsd: PRO_PRICE_USD,
    active: Boolean(activeRow),
    expiresAt: activeRow?.expires_at ?? null,
    pending: pendingRow
      ? {
          id: pendingRow.id,
          method: pendingRow.method,
          reference: pendingRow.reference,
          reportedAt: pendingRow.reported_at,
        }
      : null,
  };
  return NextResponse.json(body);
}
