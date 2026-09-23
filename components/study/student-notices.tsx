"use client";

import { Loader2, Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { mailboxCopy } from "@/lib/i18n/mailbox";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  listStudentAnnouncements,
  type TeacherAnnouncement,
} from "@/lib/supabase/teacher-student-db";

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

export function StudentNotices() {
  const t = mailboxCopy.es;
  const { authUserId, hydrated } = useKampus();

  const [notices, setNotices] = useState<TeacherAnnouncement[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canUse = hydrated && isSupabaseConfigured() && !!authUserId;

  useEffect(() => {
    if (!canUse) return;
    setLoading(true);
    setError("");
    const supabase = createSupabaseBrowserClient();
    listStudentAnnouncements(supabase)
      .then(setNotices)
      .catch(() => {
        setError(t.emptyNotices);
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
        <PageHeader eyebrow="Estudio" title={t.noticesTitle} description={t.noticesHint} />
        <Card>
          <p className="px-6 pb-6 pt-6 text-sm text-slate-300">{t.loginNeeded}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Estudio" title={t.noticesTitle} description={t.noticesHint} />

      {error && (
        <p className="rounded-xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando…
        </div>
      ) : notices.length === 0 ? (
        <Card>
          <div className="flex items-center gap-3 px-6 pb-6 pt-6">
            <Megaphone className="h-5 w-5 shrink-0 text-slate-500" />
            <p className="text-sm text-slate-400">{t.emptyNotices}</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((n) => (
            <Card key={n.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Megaphone className="mt-1 h-5 w-5 shrink-0 text-indigo-300" />
                  <div>
                    <CardTitle>{n.title}</CardTitle>
                    <CardDescription>
                      De: {n.teacherDisplayName}
                      {n.course ? ` · ${n.course}` : ""} · {formatDate(n.createdAt)}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <p className="whitespace-pre-wrap px-6 pb-6 text-sm leading-relaxed text-slate-300">
                {n.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
