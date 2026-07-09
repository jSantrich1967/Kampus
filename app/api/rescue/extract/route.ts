import { NextResponse } from "next/server";

import { runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { rescueExtractRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import {
  extractFileBufferToText,
  formatExtractCombinedText,
} from "@/lib/rescue/extract-file-buffer";
import { rescueExtractRejectReason } from "@/lib/rescue/extract-upload-limits";

export const runtime = "nodejs";
/** Multi-page PDF OCR can take longer than the default serverless limit. */
export const maxDuration = 60;

type ExtractedFile = {
  name: string;
  type: string;
  size: number;
  text: string;
};

export async function POST(req: Request) {
  const ip = getClientIpKey(req);
  const limits = rescueExtractRateLimits();
  const rl = tryConsumeRateToken(`rescue_extract:${ip}`, limits.max, limits.windowMs);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Demasiadas peticiones. Espera un momento e inténtalo de nuevo." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  const quota = await consumeDailyUserQuota(
    "rescue_extract",
    parseInt(process.env.API_DAILY_LIMIT_RESCUE_EXTRACT ?? "5", 10),
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
    return await runOpenAiRoute("rescue_extract", async () => {
      const form = await req.formData();
      const raw = form.getAll("files");
      const files = raw.filter((x): x is File => x instanceof File);

      if (files.length === 0) {
        return NextResponse.json({ files: [], combinedText: "" });
      }

      const extracted: ExtractedFile[] = [];
      for (const f of files) {
        const name = f.name || "file";
        const mime = f.type || "application/octet-stream";
        const size = f.size ?? 0;
        const reject = rescueExtractRejectReason(f);
        if (reject) {
          extracted.push({ name, type: mime, size, text: reject });
          continue;
        }

        const buf = Buffer.from(await f.arrayBuffer());
        const text = await extractFileBufferToText({ buffer: buf, name, mime, size });
        extracted.push({ name, type: mime, size, text });
      }

      const combinedText = extracted
        .map((e) => formatExtractCombinedText(e.name, e.text))
        .filter(Boolean)
        .join("\n\n");

      return NextResponse.json({ files: extracted, combinedText });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
