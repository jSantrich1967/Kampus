import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/whatsapp/twilio";

export const maxDuration = 60;

/**
 * Cron diario: recordatorios de WhatsApp para exámenes, exposiciones,
 * entregas y clases virtuales de mañana y de hoy. Protegido con CRON_SECRET
 * (Vercel Cron envía Authorization: Bearer <CRON_SECRET>).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = req.headers.get("authorization") ?? "";
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isWhatsAppConfigured()) {
    return NextResponse.json({ error: "whatsapp_not_configured" }, { status: 503 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return NextResponse.json({ error: "supabase_admin_not_configured" }, { status: 503 });
  }

  const today = caracasDate(0);
  const tomorrow = caracasDate(1);

  const { data: profileRows, error: profileErr } = await admin
    .from("profiles")
    .select("id, body");
  if (profileErr) {
    return NextResponse.json({ error: "profiles_fetch_failed" }, { status: 500 });
  }

  // Planes Pro vencidos: la suscripción activa manda; al vencer, el perfil
  // vuelve a gratis sin tocar nada más de su contenido.
  const expiredPlans = await expireProPlans(admin);

  const optedIn = (profileRows ?? []).filter((row) => {
    const body = (row.body ?? {}) as { phone?: unknown; whatsappReminders?: unknown };
    return (
      body.whatsappReminders === true &&
      typeof body.phone === "string" &&
      /^\+[1-9]\d{7,14}$/.test(body.phone)
    );
  });

  let usersNotified = 0;
  let messagesSent = 0;
  const failures: string[] = [];
  const debug = {
    profilesChecked: (profileRows ?? []).length,
    optedInCount: optedIn.length,
    perUser: [] as Array<{ u: string; events: number }>,
  };

  for (const row of optedIn) {
    const userId = row.id as string;
    const body = row.body as { phone: string; upcomingExams?: Array<{ subject?: string; date?: string }> };
    const events = await upcomingEvents(admin, userId, today, tomorrow);
    debug.perUser.push({ u: userId.slice(0, 8), events: events.length });
    // Exámenes registrados en el onboarding (viven en el perfil, no en user_exams).
    for (const ue of body.upcomingExams ?? []) {
      const date = (ue.date ?? "").slice(0, 10);
      if (date !== today && date !== tomorrow) continue;
      events.push({
        key: `profile-exam:${ue.subject ?? ""}:${date}`,
        kind: "exam",
        day: date === tomorrow ? "tomorrow" : "today",
        date,
        title: `Examen de ${ue.subject ?? "materia"}`,
        subject: ue.subject ?? "",
      });
    }
    if (events.length === 0) continue;

    const newOnes: typeof events = [];
    for (const ev of events) {
      const { data, error } = await admin
        .from("whatsapp_reminder_log")
        .insert({
          user_id: userId,
          event_key: ev.key,
          kind: ev.kind,
          reminder_day: ev.day,
          event_date: ev.date,
        })
        .select("id");
      if (!error && data && data.length > 0) {
        newOnes.push({ ...ev, logId: (data[0] as { id: string }).id });
        continue;
      }
      // Ya existe: reintentar solo si el intento anterior falló (tiene error y sin SID).
      const { data: existing } = await admin
        .from("whatsapp_reminder_log")
        .select("id, twilio_sid, error")
        .eq("user_id", userId)
        .eq("event_key", ev.key)
        .eq("reminder_day", ev.day)
        .eq("event_date", ev.date)
        .maybeSingle();
      if (existing && !(existing as { twilio_sid: string | null }).twilio_sid && (existing as { error: string | null }).error) {
        newOnes.push({ ...ev, logId: (existing as { id: string }).id });
      }
    }
    if (newOnes.length === 0) continue;

    // La plantilla ya trae "📚 Kampus te recuerda:" y "¡Éxito! 💪";
    // solo se le pasa la lista de eventos como {{1}}.
    const eventLines = buildEventLines(newOnes);
    const result = await sendWhatsAppMessage(body.phone, eventLines);

    for (const ev of newOnes) {
      await admin
        .from("whatsapp_reminder_log")
        .update(
          result.ok
            ? { twilio_sid: result.sid }
            : { error: result.error },
        )
        .eq("id", ev.logId);
    }

    if (result.ok) {
      usersNotified += 1;
      messagesSent += 1;
    } else {
      failures.push(`${userId}:${result.error}`);
    }

    await sleep(250);
  }

  return NextResponse.json({ ok: true, usersNotified, messagesSent, failures, expiredPlans, debug });
}

type EventItem = {
  key: string;
  kind: "exam" | "work" | "presentation" | "class" | "cancelled" | "duel";
  day: "tomorrow" | "today";
  date: string;
  title: string;
  subject: string;
  detail?: string;
  logId?: string;
};

async function upcomingEvents(
  admin: SupabaseClient,
  userId: string,
  today: string,
  tomorrow: string,
): Promise<EventItem[]> {
  const db = admin;
  const out: EventItem[] = [];

  const { data: exams } = await db
    .from("user_exams")
    .select("id,title,subject,due_date")
    .eq("user_id", userId)
    .neq("status", "draft")
    .in("due_date", [today, tomorrow]);
  for (const e of exams ?? []) {
    out.push({
      key: `exam:${e.id}`,
      kind: "exam",
      day: e.due_date === tomorrow ? "tomorrow" : "today",
      date: e.due_date,
      title: e.title ?? "Examen",
      subject: e.subject ?? "",
    });
  }

  const { data: works } = await db
    .from("student_works")
    .select("id,title,subject,due_date,completed_at")
    .eq("user_id", userId)
    .is("completed_at", null)
    .in("due_date", [today, tomorrow]);
  for (const w of works ?? []) {
    out.push({
      key: `work:${w.id}`,
      kind: "work",
      day: w.due_date === tomorrow ? "tomorrow" : "today",
      date: w.due_date,
      title: w.title ?? "Entrega",
      subject: w.subject ?? "",
    });
  }

  const { data: decks } = await db
    .from("user_presentation_decks")
    .select("id,deck_title,presentation_due_date")
    .eq("user_id", userId)
    .in("presentation_due_date", [today, tomorrow]);
  for (const d of decks ?? []) {
    out.push({
      key: `presentation:${d.id}`,
      kind: "presentation",
      day: d.presentation_due_date === tomorrow ? "tomorrow" : "today",
      date: d.presentation_due_date,
      title: d.deck_title ?? "Exposición",
      subject: "",
    });
  }

  // Clases virtuales en las que el estudiante está inscrito (roster).
  // El horario semanal fijo NO va aquí: se repite cada semana y sería spam.
  const { data: roster } = await db
    .from("virtual_class_roster")
    .select("session_id, virtual_class_sessions(id,course,professor_name,topic,starts_at)")
    .eq("student_user_id", userId);

  // Ventana [00:00 Caracas de hoy, 24:00 Caracas de mañana) en UTC (VE = UTC-4).
  const rangeStart = Date.parse(`${today}T00:00:00-04:00`);
  const rangeEnd = Date.parse(`${tomorrow}T00:00:00-04:00`) + 86_400_000;
  const nowMs = Date.now();
  const seenClasses = new Set<string>();
  for (const r of roster ?? []) {
    const nested = (
      r as { virtual_class_sessions?: VirtualSession | VirtualSession[] | null }
    ).virtual_class_sessions;
    const sessions = Array.isArray(nested) ? nested : nested ? [nested] : [];
    for (const s of sessions) {
      if (seenClasses.has(s.id)) continue;
      const startsMs = Date.parse(s.starts_at);
      // Fuera de la ventana de hoy/mañana, o ya comenzó: no se avisa.
      if (Number.isNaN(startsMs) || startsMs < rangeStart || startsMs >= rangeEnd || startsMs <= nowMs) {
        continue;
      }
      const date = caracasDayOf(startsMs);
      if (date !== today && date !== tomorrow) continue;
      seenClasses.add(s.id);
      out.push({
        key: `class:${s.id}`,
        kind: "class",
        day: date === tomorrow ? "tomorrow" : "today",
        date,
        title: s.topic?.trim() || s.course,
        subject: s.course,
        detail: caracasTimeOf(startsMs),
      });
    }
  }

  // Clases regulares suspendidas hoy o mañana (la clase sigue en el horario;
  // el aviso es la suspensión, no la clase).
  const { data: cancellations } = await db
    .from("user_class_cancellations")
    .select("id,schedule_id,class_date")
    .eq("user_id", userId)
    .in("class_date", [today, tomorrow]);
  if (cancellations && cancellations.length > 0) {
    const scheduleIds = [...new Set(cancellations.map((c) => c.schedule_id as string))];
    const { data: schedules } = await db
      .from("user_class_schedule")
      .select("id,subject")
      .eq("user_id", userId)
      .in("id", scheduleIds);
    const subjectById = new Map(
      (schedules ?? []).map((s) => [s.id as string, (s.subject as string) ?? "Clase"]),
    );
    for (const c of cancellations) {
      const subject = subjectById.get(c.schedule_id as string) ?? "Clase";
      out.push({
        key: `cancelled:${c.id}`,
        kind: "cancelled",
        day: c.class_date === tomorrow ? "tomorrow" : "today",
        date: c.class_date,
        title: subject,
        subject: "",
      });
    }
  }

  // Duelos: tu retador ya jugó (eres el creador y el duelo terminó) o un
  // duelo identificado espera tu turno. Solo duelos recientes (14 días);
  // la fecha de creación en event_date hace el aviso único y no repetible.
  const fourteenDaysAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const { data: finishedDuels } = await db
    .from("duels")
    .select("id,code,subject,challenger_name,created_at")
    .eq("creator_id", userId)
    .eq("status", "done")
    .gte("created_at", fourteenDaysAgo);
  for (const d of finishedDuels ?? []) {
    const created = (d.created_at as string).slice(0, 10);
    out.push({
      key: `duel-done:${d.id}`,
      kind: "duel",
      day: "today",
      date: created,
      title: (d.subject as string) ?? "Duelo",
      subject: "",
      detail: `${(d.challenger_name as string) || "Tu retador"} ya jugó · código ${d.code}`,
    });
  }
  const { data: waitingDuels } = await db
    .from("duels")
    .select("id,code,subject,creator_name,created_at")
    .eq("challenger_id", userId)
    .eq("status", "waiting")
    .is("challenger_score", null)
    .not("creator_score", "is", null)
    .gte("created_at", fourteenDaysAgo);
  for (const d of waitingDuels ?? []) {
    const created = (d.created_at as string).slice(0, 10);
    out.push({
      key: `duel-waiting:${d.id}`,
      kind: "duel",
      day: "today",
      date: created,
      title: (d.subject as string) ?? "Duelo",
      subject: "",
      detail: `espera tu turno · código ${d.code}`,
    });
  }

  return out;
}

type VirtualSession = {
  id: string;
  course: string;
  professor_name?: string | null;
  topic?: string | null;
  starts_at: string;
};

const KIND_LABEL: Record<EventItem["kind"], string> = {
  exam: "Examen",
  work: "Entrega",
  presentation: "Exposición",
  class: "Clase virtual",
  cancelled: "Clase suspendida",
  duel: "Duelo",
};

function buildEventLines(events: EventItem[]): string {
  const lines = events.map((e) => {
    const when = e.day === "tomorrow" ? "Mañana" : "Hoy";
    const subj = e.subject ? ` (${e.subject})` : "";
    const detail = e.detail ? ` · ${e.detail}` : "";
    return `• ${when}: ${KIND_LABEL[e.kind]} «${e.title}»${subj}${detail}`;
  });
  return lines.join("\n");
}

/** YYYY-MM-DD en America/Caracas con desplazamiento de días. */
function caracasDate(offsetDays: number): string {
  const d = new Date(Date.now() + offsetDays * 86_400_000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** YYYY-MM-DD en America/Caracas de un instante dado. */
function caracasDayOf(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Hora local de Caracas, ej: "2:30 p. m.". */
function caracasTimeOf(ms: number): string {
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(ms));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Degrada a plan gratis las suscripciones Pro cuyo periodo ya venció. */
async function expireProPlans(admin: SupabaseClient): Promise<number> {
  const nowIso = new Date().toISOString();
  const { data: expired } = await admin
    .from("pro_subscriptions")
    .select("id, user_id")
    .eq("status", "active")
    .lt("expires_at", nowIso)
    .limit(200);
  const rows = (expired ?? []) as Array<{ id: string; user_id: string }>;
  let count = 0;
  for (const row of rows) {
    await admin
      .from("pro_subscriptions")
      .update({ status: "expired" })
      .eq("id", row.id);
    // Solo degradar si no le queda otra suscripción activa vigente.
    const { data: stillActive } = await admin
      .from("pro_subscriptions")
      .select("id")
      .eq("user_id", row.user_id)
      .eq("status", "active")
      .gt("expires_at", nowIso)
      .limit(1);
    if ((stillActive ?? []).length === 0) {
      const { data: profileRow } = await admin
        .from("profiles")
        .select("body")
        .eq("id", row.user_id)
        .maybeSingle();
      const body = (profileRow?.body ?? {}) as Record<string, unknown>;
      if (body.plan === "premium") {
        await admin
          .from("profiles")
          .update({ body: { ...body, plan: "free" } })
          .eq("id", row.user_id);
      }
    }
    count += 1;
  }
  return count;
}
