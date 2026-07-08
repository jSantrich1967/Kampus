"use client";

import {
  Calendar,
  Camera,
  Clock,
  Loader2,
  Mic2,
  PlayCircle,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { bootstrapPresentationDemoDeck } from "@/lib/supabase/agenda-db";

type Props = {
  useCloud: boolean;
  deckCount: number;
  onDemoLoaded?: (deckId?: string) => void;
  onLoadLocalExample?: () => void;
};

const FEATURES = [
  { icon: Users, key: "presentationsFeatureTeam" as const },
  { icon: Mic2, key: "presentationsFeatureScripts" as const },
  { icon: Clock, key: "presentationsFeatureRehearsal" as const },
  { icon: Camera, key: "presentationsFeatureRecord" as const },
  { icon: Sparkles, key: "presentationsFeatureTutor" as const },
  { icon: Calendar, key: "presentationsFeatureCalendar" as const },
  { icon: Video, key: "presentationsFeatureAula" as const },
];

export function PresentationsOnboardingPanel({ useCloud, deckCount, onDemoLoaded, onLoadLocalExample }: Props) {
  const t = collaborateCopy.es;
  const { authUserId } = useKampus();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleDemo() {
    setBusy(true);
    setMessage(null);
    try {
      if (useCloud && authUserId && isSupabaseConfigured()) {
        const supabase = createSupabaseBrowserClient();
        const result = await bootstrapPresentationDemoDeck(supabase, authUserId);
        if (!result.ok || !result.deckId) {
          setMessage(t.presentationsDemoError);
          return;
        }
        setMessage(result.alreadyExists ? t.presentationsDemoExistsOk : t.presentationsDemoCreatedOk);
        onDemoLoaded?.(result.deckId);
      } else {
        onLoadLocalExample?.();
        setMessage(t.presentationsDemoLocalOk);
        onDemoLoaded?.();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.presentationsDemoError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-violet-400/30 bg-gradient-to-br from-violet-500/15 via-transparent to-indigo-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-violet-300" aria-hidden />
          {t.presentationsOnboardingTitle}
        </CardTitle>
        <CardDescription>{t.presentationsOnboardingHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-violet-300" aria-hidden />
              {t[key]}
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-300">{t.presentationsSteps}</p>

        {!useCloud ? (
          <p className="rounded-lg border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
            {t.presentationsLocalOnlyHint}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={() => void handleDemo()} className="gap-1.5">
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <PlayCircle className="h-3.5 w-3.5" aria-hidden />
            )}
            {t.presentationsDemoCta}
          </Button>
        </div>

        {deckCount <= 1 ? <p className="text-xs text-slate-500">{t.presentationsDemoFootnote}</p> : null}
        {message ? <p className="text-sm text-violet-100/90">{message}</p> : null}
      </div>
    </Card>
  );
}
