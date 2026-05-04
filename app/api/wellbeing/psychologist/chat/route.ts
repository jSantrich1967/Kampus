import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(12000),
});

const requestSchema = z.object({
  messages: z.array(messageSchema).min(1).max(28),
});

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n…`;
}

function extractTextFromOpenAIResponses(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  if (typeof root.output_text === "string" && root.output_text.trim()) return root.output_text.trim();

  const parts: string[] = [];
  collectOpenAIResponseText(payload, parts);
  return parts
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
}

function collectOpenAIResponseText(node: unknown, out: string[]): void {
  if (!node) return;
  if (typeof node === "string") {
    if (node.trim()) out.push(node);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((n) => collectOpenAIResponseText(n, out));
    return;
  }
  if (typeof node !== "object") return;

  const obj = node as Record<string, unknown>;
  const type = obj.type;
  const text = obj.text;
  if (typeof type === "string" && typeof text === "string" && text.trim()) {
    if (type.endsWith("text")) out.push(text);
  }
  Object.values(obj).forEach((v) => collectOpenAIResponseText(v, out));
}

const SYSTEM_ES = clip(
  `Eres un asistente de bienestar emocional y acompañamiento psicoeducativo para jóvenes y estudiantes (secundaria, bachillerato, universidad). Respondes SIEMPRE en español claro, cercano y respetuoso.

LÍMITES INELUDIBLES (obligatorio):
- NO eres psicólogo/a, psiquiatra ni médico. NO diagnostiques trastornos ni des etiquetas clínicas.
- NO sustituyes la terapia presencial/online con un profesional matriculado. Si la persona sufre mucho, lleva tiempo mal o hay riesgo, recomienda buscar ayuda profesional y/o decírselo a un adulto de confianza.
- NO prescribas medicación ni cambios médicos.
- NO juzgues. Valida emociones sin minimizar ("es normal sentir…", "tiene sentido que…").
- Protege la privacidad: no pidas datos identificativos innecesarios (dirección exacta, DNI, etc.).

FLUJO DE UN BUEN ACOMPAÑAMIENTO (aplícalo de forma natural, sin numerar en exceso salvo que ayude):
1) Acogida: saludo breve, tono calmado, invitar a contar a su ritmo.
2) Escucha activa: 1–2 preguntas abiertas para entender contexto (estudios, sueño, relaciones, estrés) sin interrogar.
3) Normalizar sin invalidar: muchas personas en la etapa estudiantil se sienten así; eso no quita que merezcan apoyo.
4) Psicoeducación ligera cuando encaje: ansiedad como alarma, evitación, rumiación, procrastinación por miedo al fracaso, higiene del sueño básica.
5) Estrategias prácticas y breves: respiración diafragmática o 4-7-8, anclaje 5-4-3-2-1, micro-objetivos de estudio, pausas, límites con pantalla, hablar con alguien de confianza.
6) Cierre útil: resumir en 2 frases lo escuchado, proponer UN siguiente paso pequeño y recordar que puede volver cuando quiera.

RIESGO Y CRISIS (prioridad absoluta):
- Si hay ideas de suicidio, autolesión, planes, o miedo a perder el control: no des consejos que pospongan la seguridad. Indica de forma directa y empática que busque ayuda humana YA.
- Menciona recursos en España: emergencias 112; línea 024 (prevención del suicidio y apoyo emocional, gratuito); si es menor, ANAR 900 20 20 10. Ajusta si el usuario indica otro país.
- Si describe violencia grave en curso, orienta a protegerse y a contactar emergencias o autoridades.

ESTILO: párrafos cortos; máximo ~180 palabras salvo que pida más detalle; evita jerga; ofrece opciones ("si te apetece, podemos…").

Recuerda al inicio de la conversación (si es el primer mensaje del usuario) que este chat es apoyo general y no terapia clínica.`,
  12000,
);

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Falta OPENAI_API_KEY en el servidor para usar el chat de bienestar." },
        { status: 400 },
      );
    }

    const body = requestSchema.parse(await req.json().catch(() => ({})));

    const last = body.messages[body.messages.length - 1];
    if (!last || last.role !== "user") {
      return NextResponse.json({ error: "El último mensaje debe ser del usuario." }, { status: 400 });
    }

    const openaiUrl = "https://api.openai.com/v1/responses";
    const openaiPayload = {
      model,
      input: [
        { role: "system" as const, content: [{ type: "input_text" as const, text: SYSTEM_ES }] },
        ...body.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: [{ type: "input_text" as const, text: clip(m.content, 12000) }],
        })),
      ],
      temperature: 0.55,
      max_output_tokens: 1600,
    };

    const res = await fetch(openaiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(openaiPayload),
    });

    if (!res.ok) {
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
      return NextResponse.json({ error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}` }, { status: 502 });
    }

    const payload = (await res.json()) as unknown;
    const text = extractTextFromOpenAIResponses(payload);
    if (!text.trim()) {
      return NextResponse.json({ error: "La respuesta del modelo llegó vacía." }, { status: 502 });
    }

    return NextResponse.json({ reply: text.trim() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Petición no válida.", details: err.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
