"use client";

import { GraduationCap, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { lmsProviderLabel, type LmsProvider } from "@/lib/collaborate/lms-deep-link";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { fetchLmsIntegration, upsertLmsIntegration } from "@/lib/supabase/collaborate-lms-db";

export function InstitutionLmsIntegrationPanel() {
  const t = collaborateCopy.es;
  const { profile, authUserId } = useKampus();
  const isInstitution = profile.role === "institution";

  const [provider, setProvider] = useState<LmsProvider>("moodle");
  const [baseUrl, setBaseUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isInstitution || !authUserId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const integration = await fetchLmsIntegration(supabase, authUserId);
        if (!cancelled && integration) {
          setProvider(integration.provider);
          setBaseUrl(integration.baseUrl);
        }
      } catch {
        /* optional */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, isInstitution]);

  if (!isInstitution) return null;

  async function handleSave() {
    if (!authUserId) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await upsertLmsIntegration(supabase, authUserId, provider, baseUrl);
      setMessage(t.lmsInstitutionSavedOk);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.lmsIntegrationError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-indigo-400/25 bg-gradient-to-br from-indigo-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <GraduationCap className="h-5 w-5 text-indigo-300" aria-hidden />
          {t.lmsInstitutionTitle}
        </CardTitle>
        <CardDescription>{t.lmsInstitutionHint}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {loading ? <p className="text-sm text-slate-400">{t.lmsInstitutionLoading}</p> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1 text-xs text-slate-400">
            {t.lmsProviderLabel}
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              value={provider}
              onChange={(e) => setProvider(e.target.value as LmsProvider)}
            >
              <option value="moodle">Moodle</option>
              <option value="canvas">Canvas</option>
              <option value="generic">{t.lmsProviderGeneric}</option>
            </select>
          </label>
          <label className="block space-y-1 text-xs text-slate-400">
            {t.lmsBaseUrlLabel}
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={t.lmsBaseUrlPlaceholder}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500">
          {t.lmsInstitutionFootnote(lmsProviderLabel(provider))}
        </p>
        <Button type="button" size="sm" disabled={busy || !authUserId} onClick={() => void handleSave()} className="gap-1.5">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" />}
          {t.lmsSaveIntegrationCta}
        </Button>
        {message ? <p className="text-sm text-slate-300">{message}</p> : null}
      </div>
    </Card>
  );
}
