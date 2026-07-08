import { NextResponse } from "next/server";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { virtualClassTranscribeRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { updateVirtualClassTranscript } from "@/lib/supabase/virtual-class-transcript-db";

export const runtime = "nodejs";

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(recortado)`;
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = virtualClassTranscribeRateLimits();
  const rl = tryConsumeRateToken(`virtual_class_transcribe:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "virtual_class_transcribe",
    parseInt(process.env.API_DAILY_LIMIT_VIRTUAL_CLASS_TRANSCRIBE ?? "3", 10),
  );
  if (!quota.ok) {
    return NextResponse.json(
      { error: quota.message },
      {
        status: quota.status,
        headers:
          quota.status === 429 && quota.retryAfterSec
            ? { "Retry-After": String(quota.retryAfterSec) }
            : undefined,
      },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Inicia sesión para transcribir la clase." }, { status: 401 });
  }

  try {
    return await runOpenAiRoute("virtual_class_transcribe", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe";

      if (!apiKey) {
        return NextResponse.json({ error: "Falta OPENAI_API_KEY en el servidor para transcribir." }, { status: 400 });
      }

      const form = await req.formData();
      const file = form.get("file");
      const sessionId = String(form.get("sessionId") ?? "").trim();

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Falta el archivo de audio (file)." }, { status: 400 });
      }
      if (!sessionId) {
        return NextResponse.json({ error: "Falta sessionId." }, { status: 400 });
      }

      const { data: sessionRow, error: sessionError } = await supabase
        .from("virtual_class_sessions")
        .select("id, created_by")
        .eq("id", sessionId)
        .maybeSingle();
      if (sessionError) throw sessionError;
      if (!sessionRow) {
        return NextResponse.json({ error: "Sesión no encontrada." }, { status: 404 });
      }
      if ((sessionRow as { created_by: string }).created_by !== user.id) {
        return NextResponse.json({ error: "Solo el docente creador puede subir la transcripción." }, { status: 403 });
      }

      const fd = new FormData();
      fd.append("model", model);
      fd.append("file", file, file.name || "class-audio.webm");
      fd.append("response_format", "json");

      const transcribeUrl = "https://api.openai.com/v1/audio/transcriptions";
      const res = await fetchOpenAi("virtual_class_transcribe", transcribeUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body: fd,
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
            { error: "Sin cuota OpenAI ahora (HTTP 429). Revisa facturación e inténtalo de nuevo." },
            { status: 429 },
          );
        }
        return NextResponse.json({ error: `OpenAI error (HTTP ${res.status}): ${message || "Unknown"}` }, { status: 502 });
      }

      const json = (await res.json()) as { text?: string };
      const transcript = clip(String(json.text ?? ""), 24000);
      if (!transcript.trim()) {
        return NextResponse.json({ error: "La transcripción llegó vacía." }, { status: 502 });
      }

      await updateVirtualClassTranscript(supabase, sessionId, transcript);

      return NextResponse.json({
        transcript,
        quota: { used: quota.used, limit: quota.limit },
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
