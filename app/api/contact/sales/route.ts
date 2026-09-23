import { NextResponse } from "next/server";

import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import {
  KAMPUS_SALES_EMAIL,
  salesContactSchema,
  type SalesContactPayload,
} from "@/lib/schemas/sales-contact";

export const runtime = "nodejs";

const RATE_MAX = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const RESEND_FROM = process.env.RESEND_FROM_EMAIL?.trim() || "Kampus <onboarding@resend.dev>";

/**
 * Envía el lead por correo con Resend. Devuelve false si no hay API key
 * configurada o si el envío falla (el formulario sigue respondiendo OK).
 */
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
  const emailed = await sendLeadEmail(data);

  if (process.env.NODE_ENV === "development") {
    console.info("[contact/sales]", {
      to: KAMPUS_SALES_EMAIL,
      emailed,
      ...data,
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Gracias, ${data.name.split(" ")[0]}. Te escribiremos pronto a ${data.email}.`,
    salesEmail: KAMPUS_SALES_EMAIL,
  });
}
