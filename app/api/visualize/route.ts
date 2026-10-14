import { NextResponse } from "next/server";
import { z } from "zod";

import { planLimitMessage } from "@/lib/ai/ai-budget";
import { getServerUserPlan } from "@/lib/billing/server-plan";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { consumeDailyUserQuota, refundDailyUserQuotaForCurrentUser } from "@/lib/rate-limit/user-quota";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  VISUALIZE_MAX_HTML_BYTES,
  extractHtml,
  htmlByteSize,
  isValidSimulationHtml,
  topicHash,
} from "@/lib/visualize/normalize";

export const runtime = "nodejs";
// La generación (hasta 6000 tokens de salida) tarda más que el timeout
// por defecto de la función; igual que /api/rescue/pack.
export const maxDuration = 60;

/**
 * Gating de "Simular" (decidido en servidor):
 * - Gratis: 1 simulación al día. El caché compartido NO consume cuota:
 *   si el tema ya existe, se sirve gratis a todos.
 * - Pro: simulaciones ilimitadas (dentro del presupuesto de IA).
 *
 * Para cambiar la regla con una palabra: ajusta FREE_DAILY_VISUALIZATIONS
 * (0 = sin simulaciones gratis) o la rama de premium.
 */
const FREE_DAILY_VISUALIZATIONS = parseInt(process.env.API_DAILY_LIMIT_VISUALIZE_FREE ?? "1", 10);
/**
 * Tope de tokens de salida: la generación debe caber en los 60s de maxDuration.
 * ~10KB de HTML pedidas + margen (a ~80 tok/s, 4000 tokens ≈ 50s como máximo).
 */
const MAX_OUTPUT_TOKENS = 4000;

const requestSchema = z.object({
  subject: z.string().trim().min(1).max(80),
  topic: z.string().trim().min(2).max(120),
  context: z.string().trim().max(500).optional().default(""),
});

type CachedRow = { html: string };

async function readCachedVisualization(hash: string): Promise<CachedRow | null> {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("topic_visualizations")
      .select("html")
      .eq("topic_hash", hash)
      .maybeSingle();
    if (error || !data?.html) return null;
    return { html: data.html as string };
  } catch {
    // Sin tabla (migración pendiente): se genera sin caché.
    return null;
  }
}

async function saveCachedVisualization(
  subject: string,
  topic: string,
  hash: string,
  html: string,
  model: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    await admin.from("topic_visualizations").upsert(
      { subject, topic, topic_hash: hash, html, model },
      { onConflict: "topic_hash" },
    );
  } catch {
    // El caché es best-effort: nunca rompe la respuesta.
  }
}

function buildSystemPrompt(): string {
  return (
    "Eres un generador de simulaciones educativas interactivas. " +
    "Respondes ÚNICAMENTE con un archivo HTML completo y auto-contenido: " +
    "sin texto fuera del HTML, sin markdown, sin backticks, sin explicaciones. " +
    "El HTML se muestra en un iframe sandboxed (solo scripts, sin mismo origen): " +
    "NO uses localStorage, sessionStorage, cookies, fetch, XMLHttpRequest ni ningún acceso a red."
  );
}

function buildUserPrompt(subject: string, topic: string, context: string): string {
  return (
    `Genera UN SOLO archivo HTML auto-contenido (todo el CSS y JavaScript inline; ` +
    `SIN recursos externos, SIN llamadas de red, SIN imágenes externas) con una simulación ` +
    `interactiva EN ESPAÑOL del tema "${topic}" (materia: ${subject}).` +
    (context ? ` Contexto del material del estudiante: ${context}.` : "") +
    `\n\nRequisitos:\n` +
    `- Diagrama o animación con SVG o <canvas> y JavaScript inline.\n` +
    `- Controles interactivos REALES que cambien la simulación: al menos sliders, botones o play/pausa que modifiquen lo que se ve.\n` +
    `- CADA control debe funcionar de verdad: conéctalo con addEventListener (o un atributo oninput/onclick) a una función que actualice el estado Y lo visible (etiqueta del valor y diagrama). Verifica que cada getElementById use un id que exista en el HTML y que el script no tenga errores: si un slider se mueve, su etiqueta y el diagrama deben cambiar al instante.\n` +
    `- El botón Iniciar/Pausar alterna la animación (requestAnimationFrame o setInterval) y cambia su propio texto.\n` +
    `- Etiquetas claras en español y, dentro del propio HTML, una breve explicación de qué se observa y cómo interactuar.\n` +
    `- DISEÑO DE ALTA CALIDAD, nivel libro de texto moderno: paleta armoniosa y profesional (prohibidos los colores primarios planos y los óvalos de un solo color), gradientes sutiles, sombras suaves, bordes redondeados, tipografía clara con jerarquía visual.\n` +
    `- Diagrama RICO en detalle y con profundidad: formas con gradiente, elementos etiquetados con líneas guía cuando ayude, fondo en escena (gradiente o contexto), animaciones suaves y profesionales.\n` +
    `- Controles con estilo moderno (sliders y botones bien diseñados, con estados hover/active) coherentes con la paleta.\n` +
    `- Legible con buen contraste, responsive.\n` +
    `- Máximo ~10KB de HTML. Nada de texto fuera del HTML.`
  );
}

/**
 * POST /api/visualize
 * Genera (o sirve del caché) una simulación HTML interactiva del tema.
 */
export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para usar Simular." }, { status: 401 });
  }

  const body = requestSchema.safeParse(await req.json().catch(() => ({})));
  if (!body.success) {
    return NextResponse.json({ error: "Indica la materia y el tema a simular." }, { status: 400 });
  }
  const { subject, topic, context } = body.data;
  const hash = topicHash(subject, topic);

  // El caché se sirve a todos sin consumir cuota: el costo se pagó una vez.
  const cached = await readCachedVisualization(hash);
  if (cached) {
    return NextResponse.json({ html: cached.html, cached: true });
  }

  const plan = await getServerUserPlan(supabase, user.id);
  if (plan !== "premium") {
    const quota = await consumeDailyUserQuota("visualize_free", FREE_DAILY_VISUALIZATIONS);
    if (!quota.ok) {
      return NextResponse.json(
        {
          error:
            "Ya usaste tu simulación gratis de hoy. Con Pro ($5/mes), las simulaciones son ilimitadas.",
          code: "VISUALIZE_EXHAUSTED",
        },
        {
          status: quota.status,
          headers:
            quota.status === 429 && quota.retryAfterSec
              ? { "Retry-After": String(quota.retryAfterSec) }
              : undefined,
        },
      );
    }
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta OPENAI_API_KEY en el servidor para generar simulaciones." },
      { status: 400 },
    );
  }

  try {
    return await runOpenAiRoute("visualize", async () => {
      const openaiUrl = "https://api.openai.com/v1/responses";
      const res = await fetchOpenAi(
        "visualize",
        openaiUrl,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            input: [
              { role: "system", content: [{ type: "input_text", text: buildSystemPrompt() }] },
              { role: "user", content: [{ type: "input_text", text: buildUserPrompt(subject, topic, context) }] },
            ],
            temperature: 0.3,
            max_output_tokens: MAX_OUTPUT_TOKENS,
          }),
        },
        { skipBudgetGate: false },
      );

      if (!res.ok) {
        // planLimitMessage clona la respuesta: debe llamarse ANTES de leer el
        // body, o el mensaje específico del límite se pierde (genérico).
        const planLimit = await planLimitMessage(res);
        if (planLimit) {
          return NextResponse.json({ error: planLimit }, { status: 429 });
        }
        let message = "";
        try {
          const json = (await res.json()) as { error?: { message?: string } };
          message = json.error?.message ?? "";
        } catch {
          message = (await res.text()).slice(0, 400);
        }
        if (res.status === 429) {
          return NextResponse.json(
            { error: "Sin cuota OpenAI ahora (429). Revisa facturación e inténtalo de nuevo." },
            { status: 429 },
          );
        }
        // La generación falló: devolver la cuota para no quemar la del día.
        await refundDailyUserQuotaForCurrentUser("visualize_free");
        return NextResponse.json(
          { error: `No pudimos generar la simulación (OpenAI ${res.status}). ${message}`.trim() },
          { status: 502 },
        );
      }

      const payload = (await res.json()) as unknown;
      const raw = extractResponsesOutputText(payload);
      const html = extractHtml(raw);
      if (!html || !isValidSimulationHtml(html)) {
        await refundDailyUserQuotaForCurrentUser("visualize_free");
        return NextResponse.json(
          { error: "La IA no devolvió una simulación válida. Inténtalo de nuevo con un tema más específico." },
          { status: 502 },
        );
      }
      if (htmlByteSize(html) > VISUALIZE_MAX_HTML_BYTES) {
        await refundDailyUserQuotaForCurrentUser("visualize_free");
        return NextResponse.json(
          { error: "La simulación generada excede el tamaño máximo. Inténtalo de nuevo." },
          { status: 502 },
        );
      }

      await saveCachedVisualization(subject, topic, hash, html, model);
      return NextResponse.json({ html, cached: false });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    await refundDailyUserQuotaForCurrentUser("visualize_free");
    return NextResponse.json(
      { error: `No pudimos generar la simulación ahora. ${message}` },
      { status: 502 },
    );
  }
}
