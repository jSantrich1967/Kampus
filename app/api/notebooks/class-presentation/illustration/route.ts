import { NextResponse } from "next/server";
import { z } from "zod";

import { fetchOpenAi, runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { classPresentationIllustrationRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota, refundDailyUserQuotaForCurrentUser } from "@/lib/rate-limit/user-quota";

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

/** Default: GPT Image 2 — OpenAI retired dall-e-2 / dall-e-3 in 2026. */
const DEFAULT_IMAGE_MODEL = "gpt-image-2";

const FALLBACK_IMAGE_MODELS = ["gpt-image-2", "gpt-image-1-mini", "gpt-image-1"] as const;

function normalizeImageModel(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (
    s === "image2" ||
    s === "image-2" ||
    s === "gptimage2" ||
    s === "gpt-image-2" ||
    s === "gpt_image_2" ||
    s === "chatgpt-images-2"
  ) {
    return "gpt-image-2";
  }
  if (s === "image1" || s === "gptimage1" || s === "gpt-image-1") {
    return "gpt-image-1";
  }
  if (s === "mini" || s === "gpt-image-1-mini" || s === "gptimage1mini") {
    return "gpt-image-1-mini";
  }
  // Legacy env values from the DALL-E era → map to the current API.
  if (s === "dalle2" || s === "dall-e-2" || s === "dalle3" || s === "dall-e-3" || s === "image3") {
    return "gpt-image-2";
  }
  return raw.trim();
}

function imageModelsToTry(): string[] {
  const configured = process.env.OPENAI_IMAGE_MODEL?.trim();
  const primary = normalizeImageModel(configured || DEFAULT_IMAGE_MODEL);
  const rest = FALLBACK_IMAGE_MODELS.filter((m) => m !== primary);
  return [primary, ...rest];
}

function clipPromptForModel(model: string, prompt: string): string {
  if (model === "dall-e-2") return prompt.slice(0, 1000);
  return prompt.slice(0, 3800);
}

function isGptImageModel(model: string): boolean {
  return model.startsWith("gpt-image-");
}

function buildImageRequestBody(model: string, prompt: string): Record<string, unknown> {
  const clipped = clipPromptForModel(model, prompt);
  const payload: Record<string, unknown> = {
    model,
    prompt: clipped,
    n: 1,
  };

  if (isGptImageModel(model)) {
    payload.size = "1024x1024";
    if (model !== "gpt-image-2") {
      payload.quality = "low";
    }
    return payload;
  }

  if (model === "dall-e-3") {
    payload.size = "1024x1024";
    payload.quality = "standard";
    return payload;
  }

  if (model === "dall-e-2") {
    payload.size = "1024x1024";
    return payload;
  }

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

function shouldRetryWithNextModel(errorMessage: string): boolean {
  const lower = errorMessage.toLowerCase();
  return (
    lower.includes("does not exist") ||
    lower.includes("unknown parameter") ||
    lower.includes("not available") ||
    lower.includes("invalid model") ||
    lower.includes("model_not_found")
  );
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

async function generateIllustrationBase64(
  apiKey: string,
  fullPrompt: string,
): Promise<{ b64: string } | { error: string }> {
  const models = imageModelsToTry();
  let lastError = "No se pudo generar la ilustración.";

  for (const model of models) {
    const res = await fetchOpenAi("class_presentation_illustration", "https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildImageRequestBody(model, fullPrompt)),
    });

    if (res.ok) {
      const json = (await res.json()) as ImageGenResponse;
      const b64 = await imageItemToBase64(json.data?.[0]);
      if (b64) return { b64 };
      lastError = "Respuesta de imagen vacía.";
      continue;
    }

    const errText = await res.text().catch(() => "");
    lastError = parseOpenAiError(errText);
    if (shouldRetryWithNextModel(lastError)) continue;
    return { error: lastError };
  }

  return { error: lastError };
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
    parseInt(process.env.API_DAILY_LIMIT_CLASS_PRESENTATION_ILLUSTRATION ?? "100", 10),
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

    const fullPrompt = [
      "Educational illustration for university students.",
      "Clean modern flat vector style, soft gradients, friendly and clear.",
      "No text, no letters, no watermarks, no faces of real people.",
      `Subject context: ${subject}.`,
      `Scene: ${userPrompt}`,
    ].join(" ");

    const result = await generateIllustrationBase64(apiKey, fullPrompt);
    if ("error" in result) {
      await refundDailyUserQuotaForCurrentUser("class_presentation_illustration");
      return NextResponse.json({ error: result.error }, { status: 502 });
    }

    return NextResponse.json({ imageBase64: result.b64, mimeType: "image/png" });
  });
}
