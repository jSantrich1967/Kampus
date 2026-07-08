import { NextResponse } from "next/server";

import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { KAMPUS_SALES_EMAIL, salesContactSchema } from "@/lib/schemas/sales-contact";

export const runtime = "nodejs";

const RATE_MAX = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

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

  if (process.env.NODE_ENV === "development") {
    console.info("[contact/sales]", {
      to: KAMPUS_SALES_EMAIL,
      ...data,
    });
  }

  return NextResponse.json({
    ok: true,
    message: `Gracias, ${data.name.split(" ")[0]}. Te escribiremos pronto a ${data.email}.`,
    salesEmail: KAMPUS_SALES_EMAIL,
  });
}
