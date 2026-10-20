import { NextResponse } from "next/server";
import { z } from "zod";

import { buildPublicProfileMap } from "@/lib/profile/public-profiles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  userIds: z.array(z.string().uuid()).min(1).max(60),
});

/**
 * POST /api/avatars — identidad pública (nombre visible + foto) de una lista
 * de usuarios, para Comunidad y Duelos. El body completo del perfil jamás
 * sale: aquí se recorta a esos dos campos con service_role.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ profiles: {} });

  const { data, error } = await admin.from("profiles").select("id, body").in("id", parsed.data.userIds);
  if (error) return NextResponse.json({ profiles: {} });
  return NextResponse.json({ profiles: buildPublicProfileMap((data ?? []) as { id: string; body: unknown }[]) });
}
