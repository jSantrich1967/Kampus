import { NextResponse } from "next/server";
import { z } from "zod";

import { PresentonClientError, generateWithPresenton } from "@/lib/presenton/client";
import { getPresentonServerConfig, PRESENTON_QUOTA_KEY, presentonDailyLimit } from "@/lib/presenton/config";
import { isPresentonPilotEnabled } from "@/lib/presenton/flag";
import { buildPresentonPayload, type NotebookDocumentForPresentation } from "@/lib/presenton/payload";
import { consumeDailyUserQuota, refundDailyUserQuotaForCurrentUser } from "@/lib/rate-limit/user-quota";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Generar en Presenton puede tardar minutos (LLM + export con Chromium).
// Si la plataforma corta antes (p. ej. límites de Vercel), la cuota consumida
// podría no reembolsarse: queda anotado en docs/presenton-piloto.md.
export const maxDuration = 300;

const requestSchema = z.object({
  subject: z.string().trim().min(1).max(160),
  nSlides: z.number().int().min(3).max(20).default(8),
  exportAs: z.enum(["pptx", "pdf"]).default("pptx"),
});

function clipChars(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return t.slice(0, max);
}

const NOT_CONFIGURED_BODY = {
  error:
    "La generación con Presenton aún no está configurada en este entorno. " +
    "Pide al equipo que defina PRESENTON_API_URL (y la clave API) y active el piloto.",
  code: "PRESENTON_NOT_CONFIGURED",
} as const;

export async function POST(req: Request) {
  // 1) Piloto apagado o servicio sin configurar: 503 claro, sin tocar cuota.
  const config = getPresentonServerConfig();
  if (!isPresentonPilotEnabled() || !config) {
    return NextResponse.json(NOT_CONFIGURED_BODY, { status: 503 });
  }

  // 2) Sin Supabase no hay sesión ni cuadernos que cargar.
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Inicia sesión para generar tu presentación." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos: elige un cuaderno y el número de diapositivas." }, { status: 400 });
  }
  const { subject, nSlides, exportAs } = parsed.data;

  // 3) Autenticación: solo usuarios con sesión.
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para generar tu presentación." }, { status: 401 });
  }

  // 4) Cuota diaria propia del piloto (RPC consume_api_quota vía el helper común).
  const quota = await consumeDailyUserQuota(PRESENTON_QUOTA_KEY, presentonDailyLimit(), crypto.randomUUID());
  if (!quota.ok) {
    return NextResponse.json(
      { error: quota.message },
      { status: quota.status, headers: quota.retryAfterSec ? { "Retry-After": String(quota.retryAfterSec) } : undefined },
    );
  }

  const refund = () => refundDailyUserQuotaForCurrentUser(PRESENTON_QUOTA_KEY);

  // 5) El cuaderno debe ser del propio usuario.
  const notebookRes = await supabase
    .from("user_notebooks")
    .select("id, subject")
    .eq("user_id", user.id)
    .eq("subject", subject)
    .maybeSingle();
  if (notebookRes.error) {
    await refund();
    return NextResponse.json({ error: "No pudimos leer tu cuaderno ahora. Inténtalo de nuevo." }, { status: 500 });
  }
  if (!notebookRes.data) {
    await refund();
    return NextResponse.json({ error: "No encontramos ese cuaderno en tu cuenta." }, { status: 404 });
  }

  const docsRes = await supabase
    .from("notebook_documents")
    .select("topic, lesson_point, filename, extracted_text")
    .eq("user_id", user.id)
    .eq("subject", subject)
    .order("created_at", { ascending: true })
    .limit(50);
  if (docsRes.error) {
    await refund();
    return NextResponse.json({ error: "No pudimos leer el material de tu cuaderno. Inténtalo de nuevo." }, { status: 500 });
  }

  const documents: NotebookDocumentForPresentation[] = (docsRes.data ?? []).map((doc) => ({
    topic: doc.topic ?? null,
    lessonPoint: doc.lesson_point ?? null,
    filename: String(doc.filename ?? "Documento"),
    excerpt: clipChars(String(doc.extracted_text ?? ""), 1500),
  }));

  if (!documents.some((d) => d.excerpt.trim().length > 0)) {
    await refund();
    return NextResponse.json(
      {
        error:
          "Este cuaderno todavía no tiene material con texto extraído. Sube tus documentos y espera a que Kampus extraiga el texto antes de generar la presentación.",
      },
      { status: 422 },
    );
  }

  // 6) Generación en el servicio Presenton (server-side; la clave nunca sale al cliente).
  const payload = buildPresentonPayload({ subject, documents }, { nSlides, exportAs });
  try {
    const result = await generateWithPresenton(config, payload);
    return NextResponse.json({
      presentationId: result.presentationId,
      path: result.path,
      downloadUrl: result.downloadUrl,
      editUrl: result.editUrl,
      exportAs,
    });
  } catch (err) {
    await refund();
    if (err instanceof PresentonClientError) {
      return NextResponse.json(
        { error: "No pudimos generar la presentación ahora. Inténtalo de nuevo en unos minutos.", detail: err.message },
        { status: 502 },
      );
    }
    return NextResponse.json({ error: "No pudimos generar la presentación ahora." }, { status: 502 });
  }
}
