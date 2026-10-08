import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Plan real del usuario según el servidor (profiles.body.plan), no según
 * el navegador: así nadie se "regala" Pro tocando su perfil local.
 * Las suscripciones activas las escribe el admin al aprobar un pago y el
 * cron las vence; este es el dato que manda en las rutas de IA.
 */
export async function getServerUserPlan(
  supabase: SupabaseClient,
  userId: string,
): Promise<"free" | "premium"> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("body")
      .eq("id", userId)
      .maybeSingle();
    const plan = (data?.body as { plan?: unknown } | null)?.plan;
    return plan === "premium" ? "premium" : "free";
  } catch {
    return "free";
  }
}

export const PRO_ONLY_MESSAGE =
  "Esta función es del plan Pro. Actívalo desde Ajustes → Tu plan.";
