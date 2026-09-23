"use client";

import { CheckCircle2, ClipboardCheck, Inbox, Loader2, Send } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mailboxCopy } from "@/lib/i18n/mailbox";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  listWorksForReview,
  reviewStudentWork,
  type StudentWork,
} from "@/lib/supabase/teacher-student-db";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const areaClass = `${inputClass} min-h-28`;

type Filter = "all" | "sent" | "reviewed";

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "sent", label: "Pendientes" },
  { id: "reviewed", label: "Corregidos" },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-VE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReviewWorks() {
  const t = mailboxCopy.es;
  const { authUserId, hydrated } = useKampus();

  const [works, setWorks] = useState<StudentWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { feedback: string; grade: string }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) return;
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      setWorks(await listWorksForReview(supabase));
    } catch {
      setMessage({ ok: false, text: t.reviewError });
    } finally {
      setLoading(false);
    }
  }, [authUserId, t]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  if (!authUserId || !isSupabaseConfigured()) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Enseñanza" title={t.reviewTitle} description={t.reviewHint} />
        <Card>
          <CardHeader>
            <CardTitle>{t.loginNeeded}</CardTitle>
            <CardDescription>{t.reviewHint}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const filtered = works.filter((w) => (filter === "all" ? true : w.status === filter));
  const pendingCount = works.filter((w) => w.status === "sent").length;

  function openDraft(work: StudentWork) {
    setMessage(null);
    setExpandedId((id) => (id === work.id ? null : work.id));
    setDrafts((d) =>
      d[work.id]
        ? d
        : { ...d, [work.id]: { feedback: work.feedback, grade: work.grade === null ? "" : String(work.grade) } },
    );
  }

  async function saveReview(work: StudentWork) {
    const draft = drafts[work.id] ?? { feedback: "", grade: "" };
    const gradeText = draft.grade.trim();
    const grade = gradeText === "" ? null : Number(gradeText.replace(",", "."));
    if (grade !== null && (Number.isNaN(grade) || grade < 0 || grade > 20)) return;
    setSavingId(work.id);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await reviewStudentWork(supabase, work.id, { feedback: draft.feedback, grade });
      setWorks((ws) =>
        ws.map((w) =>
          w.id === work.id
            ? { ...w, status: "reviewed" as const, feedback: draft.feedback, grade, reviewedAt: new Date().toISOString() }
            : w,
        ),
      );
      setMessage({ ok: true, text: t.reviewOk });
      setExpandedId(null);
    } catch {
      setMessage({ ok: false, text: t.reviewError });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Enseñanza"
        title={t.reviewTitle}
        description={t.reviewHint}
        actions={
          pendingCount > 0 ? (
            <Badge tone="warning">
              {pendingCount} pendiente{pendingCount === 1 ? "" : "s"}
            </Badge>
          ) : undefined
        }
      />

      {message && (
        <p
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            message.ok
              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
              : "border-rose-400/30 bg-rose-500/10 text-rose-200",
          )}
        >
          {message.text}
        </p>
      )}

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition",
              filter === f.id
                ? "bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40"
                : "text-slate-400 hover:bg-white/5 hover:text-slate-200",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Cargando trabajos…
          </div>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Inbox className="h-8 w-8 text-slate-500" />
            <p className="text-sm text-slate-400">{t.emptyReview}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((work) => {
            const draft = drafts[work.id] ?? { feedback: "", grade: "" };
            const gradeInvalid =
              draft.grade.trim() !== "" &&
              (() => {
                const n = Number(draft.grade.trim().replace(",", "."));
                return Number.isNaN(n) || n < 0 || n > 20;
              })();
            const isOpen = expandedId === work.id;
            return (
              <Card key={work.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{work.title}</CardTitle>
                      <CardDescription>
                        {work.studentDisplayName} · {work.course || "Sin materia"} · {formatDate(work.createdAt)}
                      </CardDescription>
                    </div>
                    <Badge tone={work.status === "reviewed" ? "success" : "warning"}>
                      {work.status === "reviewed" ? t.statusReviewed : t.statusSent}
                    </Badge>
                  </div>
                </CardHeader>
                <div className="space-y-4 px-6 pb-6">
                  <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40 p-4">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{work.body}</p>
                  </div>

                  {work.status === "reviewed" && !isOpen && work.feedback && (
                    <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/[0.06] p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-200/80">
                        {t.feedbackTitle}
                        {work.grade !== null ? ` · ${t.gradeLabel}: ${work.grade}` : ""}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-slate-300">{work.feedback}</p>
                    </div>
                  )}

                  {isOpen ? (
                    <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">
                          {t.feedbackTitle}
                        </label>
                        <textarea
                          className={areaClass}
                          value={draft.feedback}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [work.id]: { ...draft, feedback: e.target.value } }))
                          }
                          placeholder={t.feedbackPh}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-slate-400">
                          {t.gradeLabel}
                        </label>
                        <input
                          className={inputClass}
                          inputMode="decimal"
                          value={draft.grade}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [work.id]: { ...draft, grade: e.target.value } }))
                          }
                          placeholder={t.gradePh}
                        />
                        {gradeInvalid && (
                          <p className="mt-1 text-xs text-rose-300">La nota debe estar entre 0 y 20.</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => void saveReview(work)}
                          disabled={savingId === work.id || gradeInvalid}
                          className="gap-2"
                        >
                          {savingId === work.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                          {t.reviewCta}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => setExpandedId(null)}>
                          Cerrar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => openDraft(work)} className="gap-2">
                      {work.status === "reviewed" ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <ClipboardCheck className="h-4 w-4" />
                      )}
                      {work.status === "reviewed" ? "Editar corrección" : "Corregir"}
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
