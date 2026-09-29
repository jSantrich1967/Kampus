"use client";

import { CheckCircle2, Loader2, Paperclip, Send } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SubmissionDelivery } from "@/components/study/submission-delivery";
import { mailboxCopy } from "@/lib/i18n/mailbox";
import { submissionFileProblem } from "@/lib/study/submission-file";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { listEnrolledCourses, type EnrolledCourse } from "@/lib/supabase/courses-db";
import { logStudyActivity } from "@/lib/supabase/study-streak-db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listMyStudentWorks, submitStudentWork, type StudentWork } from "@/lib/supabase/teacher-student-db";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-24`;

type Tab = "send" | "sent";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function StudentWorks() {
  const t = mailboxCopy.es;
  const { authUserId, profile, hydrated } = useKampus();

  const [tab, setTab] = useState<Tab>("send");
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [works, setWorks] = useState<StudentWork[]>([]);
  const [loading, setLoading] = useState(false);

  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const canUse = hydrated && isSupabaseConfigured() && !!authUserId;

  useEffect(() => {
    if (!canUse || !authUserId) return;
    setLoading(true);
    const supabase = createSupabaseBrowserClient();
    Promise.all([listEnrolledCourses(supabase, authUserId), listMyStudentWorks(supabase)])
      .then(([enrolled, ws]) => {
        setCourses(enrolled.filter((course) => course.seatStatus === "active"));
        setWorks(ws);
      })
      .catch(() => {
        setError(t.sendError);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, authUserId]);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (!canUse) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Estudio" title={t.worksTitle} description={t.worksHint} />
        <Card>
          <p className="px-6 pb-6 pt-6 text-sm text-slate-300">{t.loginNeeded}</p>
        </Card>
      </div>
    );
  }

  async function reloadWorks() {
    const supabase = createSupabaseBrowserClient();
    const ws = await listMyStudentWorks(supabase);
    setWorks(ws);
  }

  async function send() {
    setError("");
    setOk("");
    if (!file) {
      setError(t.formFileMissing);
      return;
    }
    const fileProblem = submissionFileProblem(file);
    if (fileProblem === "type") {
      setError(t.formFileType);
      return;
    }
    if (fileProblem === "size") {
      setError(t.formFileSize);
      return;
    }
    if (!courseId || !title.trim()) {
      setError(t.sendError);
      return;
    }
    const course = courses.find((item) => item.id === courseId);
    if (!course || course.seatStatus !== "active") {
      setError(t.formCourseEmpty);
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await submitStudentWork(supabase, {
        courseId: course.id,
        courseName: course.name,
        title: title.trim(),
        note: note.trim(),
        file,
        studentDisplayName: profile.displayName,
      });
      setOk(t.sendOk);
      logStudyActivity("trabajo");
      setCourseId("");
      setTitle("");
      setNote("");
      setFile(null);
      await reloadWorks();
    } catch {
      setError(t.sendError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Estudio" title={t.worksTitle} description={t.worksHint} />

      <p className="rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-100">
        {t.worksPrivacy}
      </p>

      <div className="flex gap-2">
        {(
          [
            { id: "send", label: t.tabSend, icon: Send },
            { id: "sent", label: t.tabSent, icon: CheckCircle2 },
          ] as Array<{ id: Tab; label: string; icon: typeof Send }>
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition",
              tab === id
                ? "bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}
      {ok && (
        <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {ok}
        </p>
      )}

      {tab === "send" && (
        <Card>
          <CardHeader>
            <CardTitle>{t.tabSend}</CardTitle>
            <CardDescription>{t.worksHint}</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cargando…
              </div>
            ) : courses.length === 0 ? (
              <p className="text-sm text-slate-400">{t.formCourseEmpty}</p>
            ) : (
              <>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {t.formCourse} *
                  </label>
                  <select
                    className={inputClass}
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  >
                    <option value="">{t.formCourse}…</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {t.formTitle} *
                  </label>
                  <input
                    className={inputClass}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={t.formTitlePh}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {t.formFile} *
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-white/15 bg-slate-950/40 px-4 py-4 text-sm text-slate-300 hover:border-indigo-400/40">
                    <Paperclip className="h-4 w-4 text-indigo-200" />
                    <span className="min-w-0 flex-1 truncate">{file ? file.name : t.formFileChoose}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,image/webp"
                      className="sr-only"
                      onChange={(e) => {
                        setFile(e.target.files?.[0] ?? null);
                        setError("");
                      }}
                    />
                  </label>
                  <p className="mt-1 text-xs text-slate-500">{t.formFileHint}</p>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-400">
                    {t.formNote}
                  </label>
                  <textarea
                    className={areaClass}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t.formNotePh}
                  />
                </div>
                <Button onClick={send} disabled={busy} className="gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {t.sendCta}
                </Button>
              </>
            )}
          </div>
        </Card>
      )}

      {tab === "sent" && (
        <div className="space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando…
            </div>
          ) : works.length === 0 ? (
            <Card>
              <p className="px-6 pb-6 pt-6 text-sm text-slate-400">{t.emptySent}</p>
            </Card>
          ) : (
            works.map((w) => (
              <Card key={w.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle>{w.title}</CardTitle>
                    <Badge tone={w.status === "reviewed" ? "success" : "accent"}>
                      {w.status === "reviewed" ? t.statusReviewed : t.statusSent}
                    </Badge>
                  </div>
                  <CardDescription>
                    {w.course} · Para: {w.teacherDisplayName} · {formatDate(w.createdAt)}
                  </CardDescription>
                </CardHeader>
                <div className="space-y-3 px-6 pb-6">
                  <SubmissionDelivery
                    body={w.body}
                    attachmentPath={w.attachmentPath}
                    attachmentName={w.attachmentName}
                  />
                  {w.status === "reviewed" && (
                    <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.07] p-4">
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-200/80">
                        {t.feedbackTitle}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                        {w.feedback || t.noFeedback}
                      </p>
                      {w.grade !== null && (
                        <p className="mt-2 text-sm text-slate-200">
                          <span className="text-slate-400">{t.gradeLabel}: </span>
                          <span className="font-semibold text-emerald-100">{w.grade}/20</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

    </div>
  );
}
