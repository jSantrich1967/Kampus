import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isWhatsAppConfigured, sendWhatsAppMessage } from "@/lib/whatsapp/twilio";

export const maxDuration = 60;

/**
 * Cron diario: recordatorios de WhatsApp para exámenes, exposiciones y
 * entregas de mañana y de hoy. Protegido con CRON_SECRET
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
    perUserEvents: [] as Array<{ user: string; events: number; newOnes: number }>,
  };

  for (const row of optedIn) {
    const userId = row.id as string;
    const body = row.body as { phone: string; upcomingExams?: Array<{ subject?: string; date?: string }> };
    const events = await upcomingEvents(admin, userId, today, tomorrow);
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
      if (error || !data || data.length === 0) continue; // ya enviado
      newOnes.push({ ...ev, logId: (data[0] as { id: string }).id });
    }
    if (newOnes.length === 0) {
      debug.perUserEvents.push({ user: `${userId.slice(0, 8)}…`, events: events.length, newOnes: 0 });
      continue;
    }

    const message = buildMessage(newOnes);
    const result = await sendWhatsAppMessage(body.phone, message);

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
      failures.push(`${userId.slice(0, 8)}…:${result.error}`);
    }
    debug.perUserEvents.push({ user: `${userId.slice(0, 8)}…`, events: events.length, newOnes: newOnes.length });

    await sleep(250);
  }

  return NextResponse.json({ ok: true, usersNotified, messagesSent, failures, debug });
}

type EventItem = {
  key: string;
  kind: "exam" | "work" | "presentation";
  day: "tomorrow" | "today";
  date: string;
  title: string;
  subject: string;
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

  return out;
}

const KIND_LABEL: Record<EventItem["kind"], string> = {
  exam: "Examen",
  work: "Entrega",
  presentation: "Exposición",
};

function buildMessage(events: EventItem[]): string {
  const lines = events.map((e) => {
    const when = e.day === "tomorrow" ? "Mañana" : "Hoy";
    const subj = e.subject ? ` (${e.subject})` : "";
    return `• ${when}: ${KIND_LABEL[e.kind]} «${e.title}»${subj}`;
  });
  return `📚 Kampus te recuerda:\n${lines.join("\n")}\n¡Éxito! 💪`;
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
