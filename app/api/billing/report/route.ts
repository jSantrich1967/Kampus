import { NextResponse } from "next/server";
import { z } from "zod";

import { PAYMENT_INFO, PRO_PRICE_USD } from "@/lib/billing/payment-info";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const reportSchema = z.object({
  method: z.enum(["pago_movil", "zelle", "binance", "otro"]),
  reference: z.string().trim().min(4).max(80),
  months: z.coerce.number().int().min(1).max(12).default(1),
});

/** POST: el usuario reporta un pago Pro; queda 'pending' hasta que el admin lo active. */
export async function POST(req: Request) {
  if (!PAYMENT_INFO.configured) {
    return NextResponse.json(
      { error: "Estamos activando los datos de cobro. Vuelve en unas horas." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const parsed = reportSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Revisa el método y la referencia del pago." }, { status: 400 });
  }

  const { method, reference, months } = parsed.data;
  const { data, error } = await supabase
    .from("pro_subscriptions")
    .insert({
      user_id: user.id,
      months,
      amount_usd: PRO_PRICE_USD * months,
      method,
      reference,
      status: "pending",
    })
    .select("id, status, reported_at")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "No pudimos registrar tu pago. Inténtalo de nuevo." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, subscription: data });
}
