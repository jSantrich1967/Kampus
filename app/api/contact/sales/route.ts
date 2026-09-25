import { NextResponse } from "next/server";

import { salesContactOutcome } from "@/lib/contact/sales-contact-outcome";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import {
  KAMPUS_SALES_EMAIL,
  salesContactSchema,
  type SalesContactPayload,
} from "@/lib/schemas/sales-contact";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const RATE_MAX = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const RESEND_FROM = process.env.RESEND_FROM_EMAIL?.trim() || "Kampus <onboarding@resend.dev>";

/** Saves the request before sending mail. False when Supabase is not configured or the insert fails. */
async function saveLead(data: SalesContactPayload): Promise<string | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: row, error } = await admin
    .from("sales_leads")
    .insert({
      name: data.name,
      email: data.email,
      institution: data.institution,
      students: data.students ?? null,
      message: data.message,
    })
    .select("id")
    .single();
  if (error || !row?.id) return null;
  return row.id as string;
}

async function markLeadEmailed(id: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  await admin.from("sales_leads").update({ emailed: true }).eq("id", id);
}

/** Sends the lead with Resend. False when the key is missing or the provider rejects it. */
async function sendLeadEmail(data: SalesContactPayload): Promise<boolean> {
  if (!RESEND_API_KEY) return false;
  try {
    const students =
      data.students === "1-500"
        ? "1 – 500 estudiantes"
        : data.students === "501-2000"
          ? "501 – 2.000 estudiantes"
          : data.students === "2001-10000"
            ? "2.001 – 10.000 estudiantes"
            : data.students === "10000+"
              ? "Más de 10.000 estudiantes"
              : "No indicado";
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM,
        to: [KAMPUS_SALES_EMAIL],
        reply_to: data.email,
        subject: `Nuevo lead institucional: ${data.institution} — ${data.name}`,
        text: [
          `Nombre: ${data.name}`,
          `Correo: ${data.email}`,
          `Institución: ${data.institution}`,
          `Tamaño: ${students}`,
          "",
          "Mensaje:",
          data.message,
        ].join("\n"),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const ipKey = getClientIpKey(req);
  const rate = tryConsumeRateToken(`contact-sales:${ipKey}`, RATE_MAX, RATE_WINDOW_MS);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud no válida." }, { status: 400 });
  }

  const parsed = salesContactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Revisa los campos del formulario.";
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const data = parsed.data;
  const leadId = await saveLead(data);
  const emailed = await sendLeadEmail(data);
  if (emailed && leadId) await markLeadEmailed(leadId);

  if (process.env.NODE_ENV === "development") {
    console.info("[contact/sales]", {
      to: KAMPUS_SALES_EMAIL,
      saved: Boolean(leadId),
      emailed,
    });
  }

  const outcome = salesContactOutcome(emailed, data.name, data.email);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
