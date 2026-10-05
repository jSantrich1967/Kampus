import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** GET: indica si el usuario autenticado es administrador de la app. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isAdmin: false });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ isAdmin: false });
  const { data } = await admin.from("app_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return NextResponse.json({ isAdmin: Boolean(data) });
}
