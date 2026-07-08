"use client";

import { ClipboardList } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchInstitutionVirtualAttendanceSummary,
  type VirtualClassAttendanceRow,
} from "@/lib/supabase/virtual-class-attendance-db";
import { collaborateCopy } from "@/lib/i18n/collaborate";

function attendanceRate(row: VirtualClassAttendanceRow): number | null {
  if (row.enrolledCount <= 0) return null;
  return Math.round((row.attendedCount / row.enrolledCount) * 100);
}

export function InstitutionVirtualAttendancePanel() {
  const t = collaborateCopy.es;
  const { profile, authUserId } = useKampus();
  const isInstitution = profile.role === "institution";

  const [rows, setRows] = useState<VirtualClassAttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(() => {
    const sessions = rows.length;
    const enrolled = rows.reduce((sum, r) => sum + r.enrolledCount, 0);
    const attended = rows.reduce((sum, r) => sum + r.attendedCount, 0);
    const rate = enrolled > 0 ? Math.round((attended / enrolled) * 100) : null;
    return { sessions, enrolled, attended, rate };
  }, [rows]);

  useEffect(() => {
    if (!isInstitution || !authUserId || !isSupabaseConfigured()) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const data = await fetchInstitutionVirtualAttendanceSummary(supabase);
        if (!cancelled) setRows(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.institutionAttendanceError);
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, isInstitution, t.institutionAttendanceError]);

  if (!isInstitution) return null;

  return (
    <Card className="border-teal-400/25 bg-gradient-to-br from-teal-500/10 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ClipboardList className="h-5 w-5 text-teal-300" aria-hidden />
          {t.institutionAttendanceTitle}
        </CardTitle>
        <CardDescription>{t.institutionAttendanceHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {loading ? <p className="text-sm text-slate-400">{t.institutionAttendanceLoading}</p> : null}
        {error ? <p className="text-sm text-rose-200">{error}</p> : null}
        {!loading && !error && rows.length > 0 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatBlock label={t.institutionAttendanceSessions} value={totals.sessions} />
              <StatBlock label={t.institutionAttendanceEnrolled} value={totals.enrolled} />
              <StatBlock label={t.institutionAttendancePresent} value={totals.attended} />
              <StatBlock
                label={t.institutionAttendanceRate}
                value={totals.rate !== null ? `${totals.rate}%` : "—"}
              />
            </div>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-white/10 text-xs text-slate-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">{t.institutionAttendanceColCourse}</th>
                    <th className="px-3 py-2 font-medium">{t.institutionAttendanceColDate}</th>
                    <th className="px-3 py-2 font-medium">{t.institutionAttendanceColEnrolled}</th>
                    <th className="px-3 py-2 font-medium">{t.institutionAttendanceColPresent}</th>
                    <th className="px-3 py-2 font-medium">{t.institutionAttendanceColRate}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const rate = attendanceRate(row);
                    return (
                      <tr key={row.sessionId} className="border-b border-white/5 text-slate-200">
                        <td className="px-3 py-2">{row.course}</td>
                        <td className="px-3 py-2 text-slate-400">
                          {new Date(row.startsAt).toLocaleString("es-ES", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </td>
                        <td className="px-3 py-2">{row.enrolledCount}</td>
                        <td className="px-3 py-2">{row.attendedCount}</td>
                        <td className="px-3 py-2">{rate !== null ? `${rate}%` : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
        {!loading && !error && rows.length === 0 ? (
          <p className="text-sm text-slate-400">{t.institutionAttendanceEmpty}</p>
        ) : null}
      </div>
    </Card>
  );
}
