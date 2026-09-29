import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizeDuelCode } from "@/lib/duels/types";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const code = normalizeDuelCode(rawCode);
  if (!code) {
    return NextResponse.json({ error: "Código no válido." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("duels").select("*").eq("code", code).maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "No encontramos un duelo con ese código." }, { status: 404 });
  }

  // Las respuestas correctas NO se exponen: la corrección se hace en el
  // servidor al enviar las respuestas (/play).
  const { questions, ...rest } = data as { questions: Array<{ question: string; options: string[]; answerIndex: number }> };
  const publicQuestions = questions.map((q) => ({ question: q.question, options: q.options }));

  return NextResponse.json({ duel: { ...rest, questions: publicQuestions } });
}
