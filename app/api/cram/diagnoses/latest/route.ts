import { NextResponse } from "next/server";

import { getLatestDiagnosis } from "@/lib/cram/diagnoses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * GET /api/cram/diagnoses/latest?subject=...
 * Último diagnóstico guardado del usuario para la materia (para pre-llenar
 * el plan o darle contexto al Tutor). 404 cuando no hay.
 */
export async function GET(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });
  }

  const subject = new URL(req.url).searchParams.get("subject") ?? "";
  if (subject.trim().length < 2) {
    return NextResponse.json({ error: "Indica la materia." }, { status: 400 });
  }

  const diagnosis = await getLatestDiagnosis(supabase, user.id, subject);
  if (!diagnosis) {
    return NextResponse.json({ error: "Sin diagnóstico guardado." }, { status: 404 });
  }
  return NextResponse.json({ diagnosis });
}
