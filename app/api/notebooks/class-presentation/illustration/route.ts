import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { classPresentationIllustrationRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  prompt: z.string().min(8).max(900),
  subjectHint: z.string().max(120).optional(),
});

type ImageGenResponse = {
  data?: Array<{ url?: string; b64_json?: string }>;
  error?: { message?: string };
};

function buildImageRequestBody(model: string, prompt: string): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
  };

  if (model === "dall-e-3") {
    payload.size = "1024x1024";
    payload.quality = "standard";
    return payload;
  }

  if (model === "dall-e-2") {
    payload.size = "1024x1024";
    return payload;
  }

  // gpt-image-1 and other models: minimal params (no response_format / quality)
  payload.size = "1024x1024";
  return payload;
}

function parseOpenAiError(raw: string): string {
  try {
    const json = JSON.parse(raw) as { error?: { message?: string } };
    return json.error?.message?.trim() || raw.slice(0, 240);
  } catch {
    return raw.slice(0, 240) || "No se pudo generar la ilustración.";
  }
}

async function imageItemToBase64(item: { url?: string; b64_json?: string } | undefined): Promise<string | null> {
  if (!item) return null;
  if (item.b64_json?.trim()) return item.b64_json.trim();
  if (!item.url?.trim()) return null;

  const imgRes = await fetch(item.url);
  if (!imgRes.ok) return null;
  const buf = Buffer.from(await imgRes.arrayBuffer());
  return buf.toString("base64");
}

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = classPresentationIllustrationRateLimits();
  const rl = tryConsumeRateToken(`class_presentation_illustration:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas imágenes. Espera un momento." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "class_presentation_illustration",
    parseInt(process.env.API_DAILY_LIMIT_CLASS_PRESENTATION_ILLUSTRATION ?? "24", 10),
  );
  if (!quota.ok) {
    return NextResponse.json({ error: quota.message }, { status: quota.status });
  }

  const body = requestSchema.parse(await req.json().catch(() => ({})));
  const subject = body.subjectHint?.trim() || "academic topic";
  const userPrompt = body.prompt.trim();

  return runOpenAiRoute("class_presentation_illustration", async () => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "Ilustraciones no disponibles sin OPENAI_API_KEY." }, { status: 503 });
    }

    const model = process.env.OPENAI_IMAGE_MODEL?.trim() || "dall-e-3";
    const fullPrompt = [
      "Educational illustration for university students.",
      "Clean modern flat vector style, soft gradients, friendly and clear.",
      "No text, no letters, no watermarks, no faces of real people.",
      `Subject context: ${subject}.`,
      `Scene: ${userPrompt}`,
    ].join(" ");

    const res = await fetchOpenAi("class_presentation_illustration", "https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildImageRequestBody(model, fullPrompt.slice(0, 3800))),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return NextResponse.json({ error: parseOpenAiError(err) }, { status: 502 });
    }

    const json = (await res.json()) as ImageGenResponse;
    const b64 = await imageItemToBase64(json.data?.[0]);
    if (!b64) {
      return NextResponse.json({ error: "Respuesta de imagen vacía." }, { status: 502 });
    }

    return NextResponse.json({ imageBase64: b64, mimeType: "image/png" });
  });
}
