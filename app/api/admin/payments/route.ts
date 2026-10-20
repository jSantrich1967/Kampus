import { NextResponse } from "next/server";
import { z } from "zod";

import { paymentReviewFailure } from "@/lib/billing/payment-review";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Inicia sesión." }, { status: 401 }) };
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { error: NextResponse.json({ error: "Admin no configurado." }, { status: 503 }) };
  }
  const { data } = await admin
    .from("app_admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!data) return { error: NextResponse.json({ error: "Sin permiso." }, { status: 403 }) };
  return { admin, userId: user.id };
}

type SubRow = {
  id: string;
  user_id: string;
  months: number;
  amount_usd: number;
  method: string;
  reference: string;
  status: string;
  reported_at: string;
  starts_at: string | null;
  expires_at: string | null;
  receipt_path: string | null;
};

/** GET: pagos Pro pendientes + activos recientes, con datos del estudiante. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { data: subs, error } = await gate
    .admin!.from("pro_subscriptions")
    .select("id, user_id, months, amount_usd, method, reference, status, reported_at, starts_at, expires_at, receipt_path")
    .in("status", ["pending", "active"])
    .order("reported_at", { ascending: false })
    .limit(100);
  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar los pagos." }, { status: 500 });
  }

  const rows = (subs ?? []) as SubRow[];
  const userIds = [...new Set(rows.map((r) => r.user_id))];
  const names = new Map<string, { displayName: string; phone: string }>();
  if (userIds.length > 0) {
    const { data: profiles } = await gate
      .admin!.from("profiles")
      .select("id, body")
      .in("id", userIds);
    for (const p of profiles ?? []) {
      const body = (p.body ?? {}) as { displayName?: string; phone?: string };
      names.set(p.id as string, {
        displayName: body.displayName ?? "",
        phone: body.phone ?? "",
      });
    }
  }

  return NextResponse.json({
    payments: rows.map((r) => ({
      ...r,
      studentName: names.get(r.user_id)?.displayName ?? "",
      studentPhone: names.get(r.user_id)?.phone ?? "",
    })),
  });
}

const actionSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["activate", "reject", "receipt"]),
});

/** POST: el admin activa o rechaza un pago en una sola transacción. */
export async function POST(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const parsed = actionSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const { id, action } = parsed.data;

  const admin = gate.admin!;
  const { data: sub } = await admin
    .from("pro_subscriptions")
    .select("id, user_id, months, status, receipt_path")
    .eq("id", id)
    .maybeSingle();
  if (!sub) {
    return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 });
  }
  const row = sub as { id: string; user_id: string; months: number; status: string; receipt_path: string | null };

  if (action === "receipt") {
    if (!row.receipt_path) {
      return NextResponse.json({ error: "Este pago no tiene comprobante." }, { status: 404 });
    }
    const { data: signed, error: signErr } = await admin.storage
      .from("payment-receipts")
      .createSignedUrl(row.receipt_path, 3600);
    if (signErr || !signed?.signedUrl) {
      return NextResponse.json({ error: "No se pudo abrir el comprobante." }, { status: 500 });
    }
    return NextResponse.json({ url: signed.signedUrl });
  }

  if (row.status !== "pending") {
    return NextResponse.json({ error: "Ese pago ya fue procesado." }, { status: 409 });
  }

  const { data: reviewed, error: reviewError } = await admin.rpc("review_pro_payment", {
    p_subscription_id: id,
    p_action: action,
    p_reviewer: gate.userId,
  });
  if (reviewError) {
    const failure = paymentReviewFailure(reviewError.message ?? "");
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }

  const expiresAt =
    reviewed && typeof reviewed === "object" && "expiresAt" in reviewed
      ? String((reviewed as { expiresAt?: unknown }).expiresAt ?? "")
      : "";

  if (action === "activate") {
    const { data: profileRow } = await admin
      .from("profiles")
      .select("body")
      .eq("id", row.user_id)
      .maybeSingle();
    const phone = ((profileRow?.body ?? {}) as { phone?: unknown }).phone;
    if (typeof phone === "string" && /^\+[1-9]\d{7,14}$/.test(phone) && expiresAt) {
      try {
        const { sendWhatsAppMessage } = await import("@/lib/whatsapp/twilio");
        const fecha = new Date(expiresAt).toLocaleDateString("es-VE", {
          day: "numeric",
          month: "long",
          year: "numeric",
          timeZone: "America/Caracas",
        });
        await sendWhatsAppMessage(
          phone,
          `✅ Tu plan Pro de Kampus ya está activo hasta el ${fecha}. ¡Gracias por tu apoyo!`,
        );
      } catch {
        // The entitlement is already committed. The notice can fail on its own.
      }
    }
  }

  return NextResponse.json(expiresAt ? { ok: true, expiresAt } : { ok: true });
}
