import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST: el propio usuario elimina su cuenta. Borra el perfil y luego el
 * usuario de autenticación; las tablas hijas caen por sus cascadas.
 * No hay vuelta atrás: el cliente además limpia sus cajas locales.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "La eliminación automática no está disponible. Escríbenos a ventas@kampus.app y lo hacemos por ti." },
      { status: 503 },
    );
  }

  await admin.from("profiles").delete().eq("id", user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json(
      { error: "No pudimos eliminar tu cuenta. Escríbenos a ventas@kampus.app y lo hacemos por ti." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
