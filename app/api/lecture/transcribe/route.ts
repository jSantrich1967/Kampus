import { NextResponse } from "next/server";

import { planLimitMessage } from "@/lib/ai/ai-budget";
import { getServerUserPlan } from "@/lib/billing/server-plan";
import {
  dailyLimitForPlan,
  isUsefulTranscript,
  lectureQuotaExhaustedMessage,
  maxSecondsForPlan,
  validateLectureUpload,
  type ServerPlan,
} from "@/lib/lecture/validate";
import { sanitizeStorageFilename, subjectToPathSegment } from "@/lib/notebooks/paths";
import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { extractResponsesOutputText } from "@/lib/openai/extract-responses-output-text";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { lectureTranscribeRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota, refundDailyUserQuotaForCurrentUser } from "@/lib/rate-limit/user-quota";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Gating de "Grabar clase" (decidido en servidor):
 * - Gratis: 1 grabación al día, máx 10 min por grabación.
 * - Pro: 5 grabaciones al día, máx 90 min por grabación.
 *
 * Para cambiar la regla con una palabra: ajusta las constantes en
 * `lib/lecture/validate.ts` (las FREE_ y PRO_).
 */
const QUOTA_KEY = "lecture_record";

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(recortado)`;
}

function lectureDateLabel(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}-${p(d.getMinutes())}`;
}

async function transcribeAudio(apiKey: string, model: string, file: File): Promise<string> {
  const fd = new FormData();
  fd.append("model", model);
  fd.append("file", file, file.name || "clase.webm");
  fd.append("response_format", "json");

  const res = await fetchOpenAi("lecture_transcribe", "https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: fd,
  });

  if (!res.ok) {
    // planLimitMessage clona la respuesta: debe llamarse ANTES de leer el
    // body, o el mensaje específico del límite se pierde (genérico).
    const planLimit = await planLimitMessage(res);
    if (planLimit) {
      const err = new Error(planLimit) as Error & { status?: number };
      err.status = 429;
      throw err;
    }
    let message = "";
    try {
      const json = (await res.json()) as { error?: { message?: string } };
      message = json.error?.message ?? "";
    } catch {
      message = (await res.text()).slice(0, 400);
    }
    const err = new Error(
      res.status === 429
        ? "Sin cuota OpenAI ahora (HTTP 429). Revisa facturación e inténtalo de nuevo."
        : `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}`,
    ) as Error & { status?: number };
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const json = (await res.json()) as { text?: string };
  return String(json.text ?? "");
}

/** Apuntes estructurados cortos. Si la IA falla, se devuelve "" (se guarda igual la transcripción). */
async function buildLectureNotes(apiKey: string, model: string, subject: string, transcript: string): Promise<string> {
  const prompt = `Eres un asistente que convierte transcripciones de clases en apuntes de estudio claros, en español.
Materia: ${subject}.
Transcripción:
"""
${clip(transcript, 12000)}
"""
Genera apuntes estructurados en Markdown con este formato exacto:
## Temas de la clase
- (uno por línea)
## Ideas clave
- (una por línea, cortas)
## Términos importantes
- término: definición breve en una línea
Reglas: usa SOLO lo que dice la transcripción, no inventes nada; si algo no quedó claro en el audio, escríbelo tal cual ("no quedó claro en el audio"). Máximo 600 palabras. Sin introducción ni cierre.`;

  const res = await fetchOpenAi("lecture_notes", "https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [{ role: "user", content: [{ type: "input_text", text: prompt }] }],
      temperature: 0.3,
      max_output_tokens: 1500,
    }),
  });
  if (!res.ok) return "";
  const text = extractResponsesOutputText(await res.json().catch(() => null)).trim();
  return text.length >= 40 ? text : "";
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = lectureTranscribeRateLimits();
  const rl = tryConsumeRateToken(`lecture_transcribe:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para grabar tu clase." }, { status: 401 });
  }

  const plan = (await getServerUserPlan(supabase, user.id)) as ServerPlan;
  const maxSeconds = maxSecondsForPlan(plan);
  const dailyLimit = dailyLimitForPlan(plan);

  // Validación barata primero: no quema cuota diaria con subidas inválidas.
  const form = await req.formData();
  const audio = form.get("audio");
  const subject = String(form.get("subject") ?? "").trim() || "General";
  const durationSeconds = Number(form.get("durationSeconds"));

  if (!(audio instanceof File)) {
    return NextResponse.json({ error: "Falta el audio de la grabación (audio)." }, { status: 400 });
  }
  const validation = validateLectureUpload({ sizeBytes: audio.size, durationSeconds, maxSeconds });
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const quota = await consumeDailyUserQuota(QUOTA_KEY, dailyLimit);
  if (!quota.ok) {
    return NextResponse.json(
      { error: lectureQuotaExhaustedMessage(plan), code: "LECTURE_QUOTA_EXHAUSTED" },
      {
        status: quota.status,
        headers:
          quota.status === 429 && quota.retryAfterSec
            ? { "Retry-After": String(quota.retryAfterSec) }
            : undefined,
      },
    );
  }

  try {
    return await runOpenAiRoute("lecture_transcribe", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const transcribeModel = process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe";
      const chatModel = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";

      if (!apiKey) {
        await refundDailyUserQuotaForCurrentUser(QUOTA_KEY);
        return NextResponse.json({ error: "Falta OPENAI_API_KEY en el servidor para transcribir." }, { status: 400 });
      }

      let transcript: string;
      try {
        transcript = clip(await transcribeAudio(apiKey, transcribeModel, audio), 24000);
      } catch (e) {
        await refundDailyUserQuotaForCurrentUser(QUOTA_KEY);
        const status = (e as Error & { status?: number }).status ?? 502;
        const message = e instanceof Error ? e.message : "No se pudo transcribir el audio.";
        return NextResponse.json({ error: message }, { status });
      }

      // Sin transcripción útil no hay apuntes: nunca se inventa contenido.
      if (!isUsefulTranscript(transcript)) {
        await refundDailyUserQuotaForCurrentUser(QUOTA_KEY);
        return NextResponse.json(
          {
            error:
              "No se pudo obtener una transcripción útil del audio. Revisa que el micrófono haya captado la clase e inténtalo de nuevo.",
          },
          { status: 502 },
        );
      }

      // Apuntes: best-effort. Si la IA falla, se guarda igual la transcripción.
      let notes = "";
      try {
        notes = await buildLectureNotes(apiKey, chatModel, subject, transcript);
      } catch {
        notes = "";
      }

      // Guardar como documento del cuaderno de la materia (el Cuaderno es la Materia).
      const segment = subjectToPathSegment(subject);
      const dateLabel = lectureDateLabel(new Date());
      const baseName = `Clase grabada ${dateLabel}`;
      const audioName = sanitizeStorageFilename(`${baseName}.webm`);
      const audioPath = `${user.id}/${segment}/${crypto.randomUUID()}_${audioName}`;

      let storagePath = audioPath;
      let filename = `${baseName}.webm`.slice(0, 200);
      let mimeType = "audio/webm";
      let sizeBytes = audio.size;

      const { error: upErr } = await supabase.storage.from("notebooks").upload(audioPath, audio, {
        cacheControl: "3600",
        upsert: false,
        contentType: audio.type || "audio/webm",
      });
      if (upErr) {
        // Fallback: guarda la transcripción como texto para no perder el material.
        const txtName = sanitizeStorageFilename(`${baseName}.txt`);
        const txtPath = `${user.id}/${segment}/${crypto.randomUUID()}_${txtName}`;
        const body = notes ? `${notes}\n\n---\nTranscripción completa:\n${transcript}` : transcript;
        const { error: txtErr } = await supabase.storage.from("notebooks").upload(txtPath, new Blob([body], { type: "text/plain;charset=utf-8" }), {
          cacheControl: "3600",
          upsert: false,
          contentType: "text/plain;charset=utf-8",
        });
        if (txtErr) {
          return NextResponse.json(
            {
              error: "No se pudo guardar la grabación en tu cuaderno, pero aquí está la transcripción.",
              transcript,
              notes,
            },
            { status: 502 },
          );
        }
        storagePath = txtPath;
        filename = `${baseName}.txt`.slice(0, 200);
        mimeType = "text/plain;charset=utf-8";
        sizeBytes = new TextEncoder().encode(body).length;
      }

      const { error: nbErr } = await supabase.from("user_notebooks").upsert({ user_id: user.id, subject });
      if (nbErr) {
        return NextResponse.json({ error: "No se pudo crear el cuaderno de la materia." }, { status: 500 });
      }

      const extractedText = notes
        ? `${notes}\n\n---\nTranscripción completa:\n${transcript}`
        : transcript;

      const { data: doc, error: docErr } = await supabase
        .from("notebook_documents")
        .insert({
          user_id: user.id,
          subject,
          topic: "Clase grabada",
          storage_path: storagePath,
          filename,
          mime_type: mimeType,
          size_bytes: sizeBytes,
          extracted_text: extractedText,
        })
        .select("id")
        .single();

      if (docErr || !doc) {
        await supabase.storage.from("notebooks").remove([storagePath]).catch(() => {});
        return NextResponse.json({ error: "No se pudo guardar el documento en tu cuaderno." }, { status: 500 });
      }

      return NextResponse.json({
        documentId: doc.id as string,
        notebookSlug: segment,
        subject,
        transcript,
        notes,
        quota: { used: quota.used, limit: quota.limit },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
