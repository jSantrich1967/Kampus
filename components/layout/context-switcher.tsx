"use client";

import { useEffect, useState } from "react";

import { readStoredContext, selectableContexts, type ActiveContext } from "@/lib/context/active-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";

const PERSONAL = "personal";

export function ContextSwitcher({ userId }: { userId: string | null }) {
  const [context, setContext] = useState<ActiveContext>({ kind: "personal" });
  const [choices, setChoices] = useState<{ organizationId: string; name: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
      setReady(true);
      return;
    }
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    Promise.all([
      listMyOrganizations(supabase, userId),
      supabase.from("user_contexts").select("organization_id").eq("user_id", userId).maybeSingle(),
    ])
      .then(([memberships, stored]) => {
        if (cancelled) return;
        const available = selectableContexts(
          memberships.map((membership) => ({
            organizationId: membership.organizationId,
            name: membership.name,
            memberStatus: membership.memberStatus,
            organizationStatus: membership.organizationStatus,
          })),
        );
        setChoices(available.map((item) => ({ organizationId: item.organizationId, name: item.name })));
        const storedId =
          stored.error || typeof stored.data?.organization_id !== "string" ? null : stored.data.organization_id;
        setContext(readStoredContext(storedId, available));
      })
      .catch(() => {
        if (!cancelled) setContext({ kind: "personal" });
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) return null;

  async function onChange(value: string) {
    const previous = context;
    const organizationId = value === PERSONAL ? null : value;
    setMessage(null);
    const response = await fetch("/api/context", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ organizationId }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; context?: ActiveContext } | null;
    if (!response.ok || !body?.context) {
      setContext(previous);
      setMessage(body?.error ?? "No se pudo cambiar el contexto.");
      return;
    }
    setContext(body.context);
  }

  const value = context.kind === "organization" ? context.organizationId : PERSONAL;

  return (
    <label className="mt-4 block space-y-1">
      <span className="px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Contexto actual
      </span>
      <select
        aria-label="Contexto actual"
        className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2 text-sm text-slate-100"
        value={value}
        disabled={!ready}
        onChange={(event) => void onChange(event.target.value)}
      >
        <option value={PERSONAL}>Personal</option>
        {choices.map((choice) => (
          <option key={choice.organizationId} value={choice.organizationId}>
            {choice.name}
          </option>
        ))}
      </select>
      {message ? <span className="block px-1 text-xs text-amber-100">{message}</span> : null}
    </label>
  );
}
