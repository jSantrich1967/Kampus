import { NextResponse } from "next/server";
import { z } from "zod";

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
};

/** GET: pagos Pro pendientes + activos recientes, con datos del estudiante. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const { data: subs, error } = await gate
    .admin!.from("pro_subscriptions")
    .select("id, user_id, months, amount_usd, method, reference, status, reported_at, starts_at, expires_at")
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
  action: z.enum(["activate", "reject"]),
});

const DAY_MS = 86_400_000;

/** POST: el admin activa (plan premium + vencimiento) o rechaza un pago reportado. */
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
    .select("id, user_id, months, status")
    .eq("id", id)
    .maybeSingle();
  if (!sub) {
    return NextResponse.json({ error: "Pago no encontrado." }, { status: 404 });
  }
  const row = sub as { id: string; user_id: string; months: number; status: string };
  if (row.status !== "pending") {
    return NextResponse.json({ error: "Ese pago ya fue procesado." }, { status: 409 });
  }

  if (action === "reject") {
    await admin
      .from("pro_subscriptions")
      .update({ status: "rejected", reviewed_by: gate.userId, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    return NextResponse.json({ ok: true });
  }

  // Si ya tenía Pro activo, el nuevo periodo se suma a su vencimiento actual.
  const { data: current } = await admin
    .from("pro_subscriptions")
    .select("expires_at")
    .eq("user_id", row.user_id)
    .eq("status", "active")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1);
  const currentExpires = (current ?? [])[0]?.expires_at as string | undefined;
  const baseMs = currentExpires ? Math.max(Date.now(), Date.parse(currentExpires)) : Date.now();
  const expiresAt = new Date(baseMs + row.months * 30 * DAY_MS).toISOString();

  const { error: updErr } = await admin
    .from("pro_subscriptions")
    .update({
      status: "active",
      starts_at: new Date().toISOString(),
      expires_at: expiresAt,
      reviewed_by: gate.userId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (updErr) {
    return NextResponse.json({ error: "No se pudo activar el pago." }, { status: 500 });
  }

  // El plan vive en profiles.body: lo subimos a premium (la expiración la
  // hace el cron diario cuando el periodo vence).
  const { data: profileRow } = await admin
    .from("profiles")
    .select("body")
    .eq("id", row.user_id)
    .maybeSingle();
  const body = (profileRow?.body ?? {}) as Record<string, unknown>;
  await admin
    .from("profiles")
    .update({ body: { ...body, plan: "premium" } })
    .eq("id", row.user_id);

  return NextResponse.json({ ok: true, expiresAt });
}
