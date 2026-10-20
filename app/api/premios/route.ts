import { NextResponse } from "next/server";
import { z } from "zod";

import { evaluatePrizesForUser, mapPrizeRow, type Prize } from "@/lib/premios/engine";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(300).default(""),
  scope: z.enum(["global", "course"]),
  courseId: z.string().uuid().nullable().default(null),
  metric: z.enum(["dias_estudio", "racha", "duelos", "examenes", "temas_dominados"]),
  goal: z.number().int().min(1).max(365),
  minScore: z.number().int().min(1).max(100).nullable().default(null),
  reward: z.enum(["medalla", "medalla_pro"]).default("medalla"),
  proDays: z.number().int().min(1).max(30).nullable().default(null),
});

const patchSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

type CourseRow = { id: string; name?: string };

async function isAppAdmin(admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>, userId: string) {
  const { data } = await admin.from("app_admins").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
}

async function myCourses(
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>,
  userId: string,
): Promise<{ id: string; name: string }[]> {
  const { data } = await admin.from("courses").select("id, name").eq("teacher_user_id", userId);
  return ((data ?? []) as CourseRow[]).map((c) => ({ id: c.id, name: c.name ?? "Curso" }));
}

/**
 * GET: avance del estudiante en los premios visibles (otorga en el acto los
 * cumplidos) + contexto de creador (admin / dueño de cursos) con ganadores.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ configured: false, items: [], newlyAwarded: [] });

  let evaluation;
  try {
    evaluation = await evaluatePrizesForUser(admin, user.id);
  } catch (e) {
    const message = e instanceof Error ? e.message : "";
    // Sin la migración corrida, la función degrada con elegancia.
    if (/prizes|does not exist|42P01|schema cache/i.test(message)) {
      return NextResponse.json({ configured: false, items: [], newlyAwarded: [] });
    }
    return NextResponse.json({ error: "No se pudieron cargar los premios." }, { status: 500 });
  }

  const [adminFlag, courses] = await Promise.all([isAppAdmin(admin, user.id), myCourses(admin, user.id)]);

  let created: (Prize & { winners: { name: string; awardedAt: string }[] })[] = [];
  if (adminFlag || courses.length > 0) {
    const query = admin.from("prizes").select("*").order("created_at", { ascending: false });
    const { data } = adminFlag ? await query : await query.eq("creator_id", user.id);
    const prizes = ((data ?? []) as Record<string, unknown>[]).map(mapPrizeRow);
    if (prizes.length > 0) {
      const { data: awards } = await admin
        .from("prize_awards")
        .select("prize_id, user_id, awarded_at")
        .in(
          "prize_id",
          prizes.map((p) => p.id),
        )
        .order("awarded_at", { ascending: false });
      const winnerIds = [...new Set(((awards ?? []) as { user_id: string }[]).map((a) => a.user_id))];
      const names = new Map<string, string>();
      if (winnerIds.length > 0) {
        const { data: profs } = await admin.from("profiles").select("id, body").in("id", winnerIds);
        for (const p of (profs ?? []) as { id: string; body: { displayName?: unknown } | null }[]) {
          const name = typeof p.body?.displayName === "string" && p.body.displayName.trim() ? p.body.displayName : "Estudiante";
          names.set(p.id, name);
        }
      }
      created = prizes.map((p) => ({
        ...p,
        winners: ((awards ?? []) as { prize_id: string; user_id: string; awarded_at: string }[])
          .filter((a) => a.prize_id === p.id)
          .map((a) => ({ name: names.get(a.user_id) ?? "Estudiante", awardedAt: a.awarded_at })),
      }));
    }
  }

  return NextResponse.json({
    configured: true,
    isAdmin: adminFlag,
    myCourses: courses,
    items: evaluation.items,
    newlyAwarded: evaluation.newlyAwarded,
    created,
  });
}

/** POST: crear un premio. Admin → global (puede dar días Pro). Docente → solo para sus cursos y solo medalla. */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Premios aún no está activo." }, { status: 503 });

  const parsed = createSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });
  const body = parsed.data;

  const adminFlag = await isAppAdmin(admin, user.id);

  if (body.scope === "global") {
    if (!adminFlag) return NextResponse.json({ error: "Solo un administrador crea premios globales." }, { status: 403 });
  } else {
    if (!body.courseId) return NextResponse.json({ error: "Elige el curso del premio." }, { status: 400 });
    if (!adminFlag) {
      const courses = await myCourses(admin, user.id);
      if (!courses.some((c) => c.id === body.courseId)) {
        return NextResponse.json({ error: "Ese curso no es tuyo." }, { status: 403 });
      }
    }
    if (body.reward !== "medalla") {
      return NextResponse.json({ error: "Los premios de curso entregan medalla; los días Pro solo los da un premio global." }, { status: 400 });
    }
  }
  if (body.reward === "medalla_pro" && !body.proDays) {
    return NextResponse.json({ error: "Indica cuántos días Pro entrega el premio." }, { status: 400 });
  }

  const { data, error } = await admin
    .from("prizes")
    .insert({
      creator_id: user.id,
      scope: body.scope,
      course_id: body.scope === "course" ? body.courseId : null,
      title: body.title,
      description: body.description,
      metric: body.metric,
      goal: body.goal,
      min_score: body.metric === "examenes" ? (body.minScore ?? 70) : null,
      reward: body.reward,
      pro_days: body.reward === "medalla_pro" ? body.proDays : null,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: "No se pudo crear el premio." }, { status: 500 });
  return NextResponse.json({ prize: mapPrizeRow(data as Record<string, unknown>) });
}

/** PATCH: activar/pausar un premio propio (o cualquiera, si es admin). */
export async function PATCH(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Inicia sesión." }, { status: 401 });

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Premios aún no está activo." }, { status: 503 });

  const parsed = patchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Datos no válidos." }, { status: 400 });

  const adminFlag = await isAppAdmin(admin, user.id);
  let query = admin.from("prizes").update({ active: parsed.data.active }).eq("id", parsed.data.id);
  if (!adminFlag) query = query.eq("creator_id", user.id);
  const { data, error } = await query.select("id");
  if (error || !data || data.length === 0) {
    return NextResponse.json({ error: "No se pudo actualizar el premio." }, { status: 403 });
  }
  return NextResponse.json({ ok: true });
}
