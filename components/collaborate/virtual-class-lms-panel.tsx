"use client";

import { ExternalLink, GraduationCap, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildLmsCourseUrl, lmsProviderLabel, type LmsProvider } from "@/lib/collaborate/lms-deep-link";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchLmsIntegration,
  updateVirtualClassLmsCourseId,
  upsertLmsIntegration,
} from "@/lib/supabase/collaborate-lms-db";

type Props = {
  sessionId: string;
  isCreator: boolean;
  creatorUserId: string;
  lmsCourseId: string | null;
  onUpdated?: (courseId: string | null) => void;
};

export function VirtualClassLmsPanel({
  sessionId,
  isCreator,
  creatorUserId,
  lmsCourseId,
  onUpdated,
}: Props) {
  const t = collaborateCopy.es;
  const { authUserId } = useKampus();
  const canConfigure = isCreator && authUserId === creatorUserId;

  const [provider, setProvider] = useState<LmsProvider>("moodle");
  const [baseUrl, setBaseUrl] = useState("");
  const [courseId, setCourseId] = useState(lmsCourseId ?? "");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const integration = await fetchLmsIntegration(supabase, creatorUserId);
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
  }, [authUserId, creatorUserId]);

  useEffect(() => {
    setCourseId(lmsCourseId ?? "");
  }, [lmsCourseId]);

  const deepLink =
    baseUrl.trim() && courseId.trim()
      ? buildLmsCourseUrl({ provider, baseUrl }, courseId)
      : null;

  async function handleSaveIntegration() {
    if (!authUserId || !canConfigure) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await upsertLmsIntegration(supabase, authUserId, provider, baseUrl);
      setMessage(t.lmsIntegrationSavedOk);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.lmsIntegrationError);
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveCourseId() {
    if (!canConfigure) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const id = courseId.trim() || null;
      await updateVirtualClassLmsCourseId(supabase, sessionId, id);
      onUpdated?.(id);
      setMessage(t.lmsCourseSavedOk);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.lmsIntegrationError);
    } finally {
      setBusy(false);
    }
  }

  if (!canConfigure && !deepLink) return null;

  return (
    <Card className="border-indigo-400/20 bg-indigo-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4 text-indigo-300" aria-hidden />
          {t.lmsTitle}
        </CardTitle>
        <CardDescription>{canConfigure ? t.lmsHintCreator : t.lmsHintStudent}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {canConfigure ? (
          <>
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
              <label className="block space-y-1 text-xs text-slate-400 sm:col-span-1">
                {t.lmsBaseUrlLabel}
                <input
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder={t.lmsBaseUrlPlaceholder}
                />
              </label>
            </div>
            <Button type="button" size="sm" disabled={busy || loading} onClick={() => void handleSaveIntegration()} className="gap-1.5">
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Save className="h-3.5 w-3.5" />}
              {t.lmsSaveIntegrationCta}
            </Button>
            <label className="block space-y-1 text-xs text-slate-400">
              {t.lmsCourseIdLabel}
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                placeholder={t.lmsCourseIdPlaceholder}
              />
            </label>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void handleSaveCourseId()}>
              {t.lmsSaveCourseCta}
            </Button>
          </>
        ) : null}
        {deepLink ? (
          <a href={deepLink} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary", size: "sm", className: "gap-2" })}>
            <ExternalLink className="h-3.5 w-3.5" />
            {t.lmsOpenCourseCta(lmsProviderLabel(provider))}
          </a>
        ) : canConfigure ? (
          <p className="text-xs text-slate-500">{t.lmsEmptyHint}</p>
        ) : null}
        {message ? <p className="text-xs text-slate-400">{message}</p> : null}
      </div>
    </Card>
  );
}
