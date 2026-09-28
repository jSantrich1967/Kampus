import { NextResponse } from "next/server";
import { z } from "zod";

import { acceptContextSwitch, type ContextMembership } from "@/lib/context/active-context";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  organizationId: z.string().uuid().nullable(),
});

function missingContextTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42P01" || error.code === "PGRST205" || /user_contexts/.test(message);
}

/** Saves Personal, or an organization the signed-in user actively belongs to. */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "El contexto no es válido." }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (userError || !userId) {
    return NextResponse.json({ error: "Inicia sesión para cambiar de contexto." }, { status: 401 });
  }

  const memberships = await listMyOrganizations(supabase, userId).catch(() => []);
  const choices: ContextMembership[] = memberships.map((membership) => ({
    organizationId: membership.organizationId,
    name: membership.name,
    memberStatus: membership.memberStatus,
    organizationStatus: membership.organizationStatus,
  }));
  const decision = acceptContextSwitch(parsed.data.organizationId, choices);
  if (!decision.ok) {
    return NextResponse.json({ error: decision.message }, { status: 403 });
  }

  const { error } = await supabase.from("user_contexts").upsert({
    user_id: userId,
    organization_id: decision.context.kind === "organization" ? decision.context.organizationId : null,
  });
  if (error) {
    if (missingContextTable(error)) {
      return NextResponse.json(
        { error: "El contexto todavía no está guardado en la base. Tu sesión sigue abierta." },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "No se pudo guardar el contexto." }, { status: 403 });
  }

  return NextResponse.json({
    context:
      decision.context.kind === "organization"
        ? { kind: "organization", organizationId: decision.context.organizationId, name: decision.context.name }
        : { kind: "personal" },
  });
}
