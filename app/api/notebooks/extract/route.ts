import { NextResponse } from "next/server";
import { z } from "zod";

import { runOpenAiRoute } from "@/lib/observability/openai-sentry";
import { MAX_NOTEBOOK_UPLOAD_BYTES } from "@/lib/notebooks/upload-documents";
import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";
import { rescueExtractRateLimits } from "@/lib/rate-limit/openai-defaults";
import { consumeDailyUserQuota } from "@/lib/rate-limit/user-quota";
import {
  extractFileBufferToText,
  formatExtractCombinedText,
} from "@/lib/rescue/extract-file-buffer";
import { isUsefulExtractedText } from "@/lib/rescue/extract-text-quality";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  documentId: z.string().uuid(),
  /** Re-run OpenAI OCR even when cached text exists (e.g. after fixes). */
  force: z.boolean().optional(),
});

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
    const parsed = bodySchema.parse(await req.json().catch(() => ({})));
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json({ error: "Inicia sesión para extraer texto del cuaderno." }, { status: 401 });
    }

    const { data: doc, error: docErr } = await supabase
      .from("notebook_documents")
      .select("id, filename, mime_type, size_bytes, storage_path, extracted_text")
      .eq("id", parsed.documentId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (docErr || !doc) {
      return NextResponse.json({ error: "No encontramos ese archivo en tu cuaderno." }, { status: 404 });
    }

    if (!parsed.force && isUsefulExtractedText(doc.extracted_text ?? "")) {
      const combinedText = doc.extracted_text!.trim();
      return NextResponse.json({ combinedText, useful: true, cached: true });
    }

    if (doc.size_bytes > MAX_NOTEBOOK_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `“${doc.filename}” supera el límite de ${MAX_NOTEBOOK_UPLOAD_BYTES / 1024 / 1024} MB.`,
        },
        { status: 413 },
      );
    }

    return await runOpenAiRoute("rescue_extract", async () => {
      const { data: blob, error: dlErr } = await supabase.storage.from("notebooks").download(doc.storage_path);
      if (dlErr || !blob) {
        return NextResponse.json(
          { error: dlErr?.message || "No se pudo descargar el archivo desde la nube." },
          { status: 500 },
        );
      }

      const buffer = Buffer.from(await blob.arrayBuffer());
      const text = await extractFileBufferToText({
        buffer,
        name: doc.filename,
        mime: doc.mime_type || blob.type || "application/octet-stream",
        size: doc.size_bytes,
      });
      const combinedText = formatExtractCombinedText(doc.filename, text);
      const useful = isUsefulExtractedText(text);

      if (useful) {
        await supabase.from("notebook_documents").update({ extracted_text: combinedText }).eq("id", doc.id);
      }

      return NextResponse.json({
        combinedText,
        useful,
        cached: false,
        ...(useful ? {} : { hint: "No se pudo leer texto útil. Revisa OPENAI_API_KEY en Vercel o sube un PDF más nítido." }),
      });
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
