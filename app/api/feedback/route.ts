import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const feedbackSchema = z.object({
  category: z.enum(["error", "sugerencia", "mejora", "otro"]).default("sugerencia"),
  message: z.string().trim().min(1).max(2000),
  page: z.string().trim().max(200).default(""),
});

/** POST: el usuario autenticado envía una observación de mejora. */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para enviar observaciones." }, { status: 401 });
  }

  const parsed = feedbackSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  }

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    category: parsed.data.category,
    message: parsed.data.message,
    page: parsed.data.page || null,
  });
  if (error) {
    return NextResponse.json({ error: "No se pudo guardar tu observación." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

/** GET: el usuario ve sus propias observaciones. */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("feedback")
    .select("id, category, message, page, status, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) {
    return NextResponse.json({ error: "No se pudieron cargar tus observaciones." }, { status: 500 });
  }
  return NextResponse.json({ feedback: data ?? [] });
}
