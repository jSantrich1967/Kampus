"use client";

import Link from "next/link";
import {
  Activity,
  DoorOpen,
  Film,
  GraduationCap,
  Loader2,
  PlayCircle,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { bootstrapVirtualClassDemo } from "@/lib/supabase/virtual-class-db";

type Props = {
  sessionCount: number;
  onDemoCreated?: () => void;
};

const FEATURES = [
  { icon: Video, labelKey: "classroomFeatureVideo" as const },
  { icon: Users, labelKey: "classroomFeatureRoster" as const },
  { icon: DoorOpen, labelKey: "classroomFeatureBreakout" as const },
  { icon: Film, labelKey: "classroomFeatureRecording" as const },
  { icon: Activity, labelKey: "classroomFeatureParticipation" as const },
  { icon: GraduationCap, labelKey: "classroomFeatureLms" as const },
];

export function VirtualClassroomOnboardingPanel({ sessionCount, onDemoCreated }: Props) {
  const t = collaborateCopy.es;
  const { profile, authUserId } = useKampus();
  const canCreate = profile.role === "teacher" || profile.role === "institution";
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);

  async function handleDemo() {
    if (!authUserId) return;
    setBusy(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = await bootstrapVirtualClassDemo(supabase);
      if (!result.ok || !result.sessionId) {
        setMessage(t.classroomDemoError);
        return;
      }
      setDemoSessionId(result.sessionId);
      setMessage(result.alreadyExists ? t.classroomDemoExistsOk : t.classroomDemoCreatedOk);
      onDemoCreated?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.classroomDemoError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-teal-400/30 bg-gradient-to-br from-teal-500/15 via-transparent to-indigo-500/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-teal-300" aria-hidden />
          {t.classroomOnboardingTitle}
        </CardTitle>
        <CardDescription>{t.classroomOnboardingHint}</CardDescription>
      </CardHeader>
      <div className="space-y-5 px-6 pb-6">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, labelKey }) => (
            <div
              key={labelKey}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-teal-300" aria-hidden />
              {t[labelKey]}
            </div>
          ))}
        </div>

        {canCreate ? (
          <div className="space-y-2 rounded-xl border border-teal-400/20 bg-teal-500/5 p-4">
            <p className="text-sm text-slate-200">{t.classroomTeacherSteps}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" disabled={busy} onClick={() => void handleDemo()} className="gap-1.5">
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                )}
                {t.classroomDemoCta}
              </Button>
              {demoSessionId ? (
                <Link
                  href={`/collaborate/aula-virtual/${encodeURIComponent(demoSessionId)}`}
                  className={buttonClasses({ size: "sm", variant: "secondary", className: "gap-1.5" })}
                >
                  <Video className="h-3.5 w-3.5" />
                  {t.classroomDemoEnterCta}
                </Link>
              ) : null}
            </div>
            {sessionCount === 0 ? (
              <p className="text-xs text-slate-500">{t.classroomDemoFootnote}</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            <p>{t.classroomStudentSteps}</p>
            {sessionCount === 0 ? (
              <p className="mt-2 text-xs text-slate-500">{t.classroomStudentEmptyHint}</p>
            ) : null}
          </div>
        )}

        {message ? <p className="text-sm text-teal-100/90">{message}</p> : null}
      </div>
    </Card>
  );
}
