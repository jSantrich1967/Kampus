"use client";

import { Loader2, PlusCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createVirtualClassSession } from "@/lib/supabase/virtual-class-db";
import { isDemoModeClient, saveDemoVcSession } from "@/lib/storage/virtual-class-demo-storage";

export type VirtualClassSchedulePrefill = {
  scheduleRowId: string;
  classDate: string;
  subject: string;
  professorName: string;
  location: string;
  startsLocal: string;
  endsLocal: string;
};

type Props = {
  onCreated?: () => void;
  schedulePrefill?: VirtualClassSchedulePrefill | null;
};

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultStartsLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 2);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function defaultEndsLocal(startsLocal: string): string {
  const d = new Date(startsLocal);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VirtualClassroomCreateForm({ onCreated, schedulePrefill }: Props) {
  const t = collaborateCopy.es;
  const { profile, authUserId } = useKampus();
  const canCreate = profile.role === "teacher" || profile.role === "institution";

  const [scheduleRowId, setScheduleRowId] = useState<string | null>(null);
  const [classDate, setClassDate] = useState<string | null>(null);
  const [course, setCourse] = useState(profile.subjects[0] ?? "");
  const [professorName, setProfessorName] = useState(profile.displayName || "");
  const [topic, setTopic] = useState("");
  const [roomLabel, setRoomLabel] = useState("");
  const [capacity, setCapacity] = useState("30");
  const [startsLocal, setStartsLocal] = useState(defaultStartsLocal);
  const [endsLocal, setEndsLocal] = useState(() => defaultEndsLocal(defaultStartsLocal()));
  const [openEnrollment, setOpenEnrollment] = useState(true);
  const [joinUrl, setJoinUrl] = useState("");
  const [embedVideoUrl, setEmbedVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  /** En modo demo (sin sesión) el docente sí puede crear: se guarda en este dispositivo. */
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    setDemoMode(isDemoModeClient() && !authUserId);
  }, [authUserId]);

  const subjectOptions = useMemo(() => profile.subjects.filter(Boolean), [profile.subjects]);

  useEffect(() => {
    if (!schedulePrefill) return;
    setScheduleRowId(schedulePrefill.scheduleRowId);
    setClassDate(schedulePrefill.classDate);
    setCourse(schedulePrefill.subject);
    setProfessorName(schedulePrefill.professorName || profile.displayName || "");
    setRoomLabel(schedulePrefill.location);
    setStartsLocal(schedulePrefill.startsLocal);
    setEndsLocal(schedulePrefill.endsLocal);
    setTopic(t.createSessionFromScheduleTopic(schedulePrefill.classDate));
  }, [schedulePrefill, profile.displayName, t]);

  if (!canCreate || (!authUserId && !demoMode)) return null;

  async function handleSubmit() {
    if (!course.trim() || !professorName.trim() || !startsLocal) {
      setMessage(t.createSessionRequired);
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      if (demoMode) {
        saveDemoVcSession({
          id: `demo_${Date.now().toString(36)}`,
          course: course.trim(),
          professor: professorName.trim(),
          topic: topic.trim(),
          roomLabel: roomLabel.trim(),
          capacity: Math.min(500, Math.max(1, Number(capacity) || 30)),
          enrolled: 0,
          startsAt: new Date(startsLocal).toISOString(),
          joinUrl: joinUrl.trim() || null,
          embedVideoUrl: embedVideoUrl.trim() || null,
        });
        setMessage(t.createSessionOk);
        setTopic("");
        onCreated?.();
        return;
      }
      const supabase = createSupabaseBrowserClient();
      const startsAt = new Date(startsLocal).toISOString();
      const endsAt = endsLocal ? new Date(endsLocal).toISOString() : null;
      await createVirtualClassSession(supabase, authUserId!, {
        course: course.trim(),
        professorName: professorName.trim(),
        topic: topic.trim(),
        roomLabel: roomLabel.trim(),
        capacity: Math.min(500, Math.max(1, Number(capacity) || 30)),
        startsAt,
        endsAt,
        openEnrollment,
        joinUrl: joinUrl.trim() || null,
        embedVideoUrl: embedVideoUrl.trim() || null,
        scheduleRowId,
        classDate,
      });
      setMessage(t.createSessionOk);
      setTopic("");
      onCreated?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.createSessionError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="border-teal-400/25 bg-gradient-to-br from-teal-500/10 to-transparent md:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <PlusCircle className="h-5 w-5 text-teal-300" aria-hidden />
          {t.createSessionTitle}
        </CardTitle>
        <CardDescription>
          {schedulePrefill ? t.createSessionFromScheduleHint(schedulePrefill.classDate) : t.createSessionHint}
          {demoMode ? (
            <span className="mt-1 block text-amber-100/90">
              Sesiones de demostración: se guardan en este dispositivo y no se comparten.
            </span>
          ) : null}
        </CardDescription>
      </CardHeader>
      <div className="grid gap-3 px-6 pb-6 sm:grid-cols-2">
        <label className="block space-y-1 text-xs text-slate-400 sm:col-span-2">
          {t.createSessionCourse}
          <input
            list="vc-course-subjects"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
          />
          <datalist id="vc-course-subjects">
            {subjectOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          {t.createSessionProfessor}
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={professorName}
            onChange={(e) => setProfessorName(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          {t.createSessionRoom}
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={roomLabel}
            onChange={(e) => setRoomLabel(e.target.value)}
            placeholder={t.createSessionRoomPlaceholder}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400 sm:col-span-2">
          {t.createSessionTopic}
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          {t.createSessionStarts}
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={startsLocal}
            onChange={(e) => {
              setStartsLocal(e.target.value);
              setEndsLocal(defaultEndsLocal(e.target.value));
            }}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          {t.createSessionEnds}
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={endsLocal}
            onChange={(e) => setEndsLocal(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          {t.createSessionCapacity}
          <input
            type="number"
            min={1}
            max={500}
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400">
          {t.createSessionJoinUrl}
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={joinUrl}
            onChange={(e) => setJoinUrl(e.target.value)}
            placeholder="https://meet.google.com/..."
          />
        </label>
        <label className="block space-y-1 text-xs text-slate-400 sm:col-span-2">
          {t.createSessionEmbedUrl}
          <input
            className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={embedVideoUrl}
            onChange={(e) => setEmbedVideoUrl(e.target.value)}
            placeholder="https://www.youtube.com/embed/..."
          />
          <span className="text-[11px] text-slate-600">{t.createSessionEmbedHint}</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-400 sm:col-span-2">
          <input type="checkbox" checked={openEnrollment} onChange={(e) => setOpenEnrollment(e.target.checked)} />
          {t.createSessionOpenEnrollment}
        </label>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="button" disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
            {t.createSessionCta}
          </Button>
          {message ? <p className="text-xs text-slate-400">{message}</p> : null}
        </div>
      </div>
    </Card>
  );
}
