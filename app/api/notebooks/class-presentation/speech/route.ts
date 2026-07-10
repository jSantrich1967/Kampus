import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { classPresentationSpeechRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota, refundDailyUserQuotaForCurrentUser } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";
export const maxDuration = 30;

const requestSchema = z.object({
  text: z.string().min(1).max(3500),
});

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = classPresentationSpeechRateLimits();
  const rl = tryConsumeRateToken(`class_presentation_speech:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones de voz. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "class_presentation_speech",
    parseInt(process.env.API_DAILY_LIMIT_CLASS_PRESENTATION_SPEECH ?? "100", 10),
  );
  if (!quota.ok) {
    return NextResponse.json({ error: quota.message }, { status: quota.status });
  }

  const body = requestSchema.parse(await req.json().catch(() => ({})));
  const text = body.text.trim();

  return runOpenAiRoute("class_presentation_speech", async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Voz no disponible sin OPENAI_API_KEY." }, { status: 503 });
    }

    const voice = (process.env.OPENAI_TTS_VOICE?.trim() || "nova") as "nova" | "alloy" | "shimmer";
    const model = process.env.OPENAI_TTS_MODEL?.trim() || "tts-1-hd";

    const res = await fetchOpenAi("class_presentation_speech", "https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice,
        input: text,
        response_format: "mp3",
        speed: 0.96,
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      await refundDailyUserQuotaForCurrentUser("class_presentation_speech");
      return NextResponse.json({ error: err.slice(0, 200) || "No se pudo generar el audio." }, { status: 502 });
    }

    const audio = await res.arrayBuffer();
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  });
}
