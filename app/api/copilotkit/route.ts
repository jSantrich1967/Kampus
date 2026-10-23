import { NextResponse } from "next/server";
import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import OpenAI from "openai";

import {
  COPILOT_PILOT_QUOTA_KEY,
  copilotPilotDailyLimit,
  isCopilotPilotEnabled,
} from "@/lib/copilot-pilot/config";
import {
  consumeDailyUserQuota,
  refundDailyUserQuotaForCurrentUser,
} from "@/lib/rate-limit/user-quota";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Igual que el Tutor: el timeout del modelo debe quedar por debajo de este
// límite para que un fallo pueda reembolsar la cuota consumida.
export const maxDuration = 60;

/**
 * Piloto CopilotKit (rama piloto/copilotkit).
 *
 * Reglas, iguales a las demás rutas de IA de Kampus:
 * - Apagado por defecto: sin NEXT_PUBLIC_COPILOT_PILOT_ENABLED="true" → 404.
 * - Sin sesión de Supabase → 401. Nunca hay acceso anónimo al modelo.
 * - Cada POST consume cuota diaria vía `consume_api_quota` (RPC existente)
 *   con la clave propia del piloto (`copilot_pilot`); si el runtime falla
 *   después de consumir, se reembolsa como hace el Tutor.
 * - El proveedor es el mismo de la app: OpenAI (OPENAI_API_KEY /
 *   OPENAI_MODEL, por defecto gpt-4.1-mini).
 */

async function requireAuthenticatedUser(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return Boolean(user) && !error;
  } catch {
    return false;
  }
}

function pilotDisabled(): NextResponse {
  return NextResponse.json({ error: "Piloto no disponible." }, { status: 404 });
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "Inicia sesión para usar el asistente." },
    { status: 401 },
  );
}

function copilotHandler(req: Request): Promise<Response> | Response {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "El asistente no está configurado en este servidor." },
      { status: 503 },
    );
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4.1-mini";
  const copilotRuntime = new CopilotRuntime();
  const serviceAdapter = new OpenAIAdapter({
    openai: new OpenAI({ apiKey }),
    model,
  });
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime: copilotRuntime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });
  return handleRequest(req);
}

export async function GET(req: Request) {
  if (!isCopilotPilotEnabled()) return pilotDisabled();
  if (!(await requireAuthenticatedUser())) return unauthorized();
  return copilotHandler(req);
}

export async function POST(req: Request) {
  if (!isCopilotPilotEnabled()) return pilotDisabled();

  if (!(await requireAuthenticatedUser())) return unauthorized();

  const quota = await consumeDailyUserQuota(
    COPILOT_PILOT_QUOTA_KEY,
    copilotPilotDailyLimit(),
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
    return await copilotHandler(req);
  } catch {
    // La cuota cuenta respuestas, no intentos (patrón del Tutor).
    await refundDailyUserQuotaForCurrentUser(COPILOT_PILOT_QUOTA_KEY);
    return NextResponse.json(
      { error: "El asistente falló. Inténtalo de nuevo." },
      { status: 502 },
    );
  }
}
