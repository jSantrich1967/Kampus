import { NextResponse } from "next/server";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { presentationTranscribeRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";

function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}\n\n...(recortado)`;
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = presentationTranscribeRateLimits();
  const rl = tryConsumeRateToken(`presentation_transcribe:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "presentation_transcribe",
    parseInt(process.env.API_DAILY_LIMIT_PRESENTATION_TRANSCRIBE ?? "1", 10),
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

  try {
    return await runOpenAiRoute("presentation_transcribe", async () => {
      const apiKey = process.env.OPENAI_API_KEY?.trim();
      const model = process.env.OPENAI_TRANSCRIBE_MODEL?.trim() || "gpt-4o-mini-transcribe";

      if (!apiKey) {
        return NextResponse.json({ error: "Falta OPENAI_API_KEY en el servidor para transcribir." }, { status: 400 });
      }

      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Falta el archivo de audio/video (file)." }, { status: 400 });
      }

      // OpenAI audio transcriptions expects multipart/form-data: file + model.
      const fd = new FormData();
      fd.append("model", model);
      fd.append("file", file, file.name || "rehearsal.webm");
      fd.append("response_format", "json");

      const transcribeUrl = "https://api.openai.com/v1/audio/transcriptions";
      const res = await fetchOpenAi("presentation_transcribe", transcribeUrl, {
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
      const transcript = clip(String(json.text ?? ""), 12000);
      if (!transcript.trim()) {
        return NextResponse.json({ error: "La transcripción llegó vacía." }, { status: 502 });
      }

      return NextResponse.json({ transcript });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

