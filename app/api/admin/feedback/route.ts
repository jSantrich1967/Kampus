import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function isAppAdmin(userId: string): Promise<boolean> {
  const admin = createSupabaseAdminClient();
  if (!admin) return false;
  const { data } = await admin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: "Inicia sesión." }, { status: 401 }) };
  if (!(await isAppAdmin(user.id))) {
    return { error: NextResponse.json({ error: "Sin permiso." }, { status: 403 }) };
  }
  return { admin: createSupabaseAdminClient()! };
}

/** GET: el administrador ve todas las observaciones. */
export async function GET(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const status = new URL(req.url).searchParams.get("status") ?? "";
  let query = gate
    .admin!.from("feedback")
    .select("id, user_id, category, message, page, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (["nueva", "revisada", "aplicada", "descartada"].includes(status)) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar las observaciones." }, { status: 500 });
  }
  return NextResponse.json({ feedback: data ?? [] });
}

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["nueva", "revisada", "aplicada", "descartada"]),
});

/** PATCH: el administrador cambia el estado de una observación. */
export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if (gate.error) return gate.error;

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  const { error } = await gate
    .admin!.from("feedback")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);
  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
