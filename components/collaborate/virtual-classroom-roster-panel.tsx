"use client";

import { Loader2, UserMinus, UserPlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  addVirtualClassRosterByEmail,
  addVirtualClassRosterStudent,
  listVirtualClassRoster,
  removeVirtualClassRosterStudent,
  type VirtualClassRosterRow,
} from "@/lib/supabase/virtual-class-db";

type Props = {
  sessionId: string;
  capacity: number;
  enrolled: number;
  onRosterChange?: () => void;
};

export function VirtualClassroomRosterPanel({ sessionId, capacity, enrolled, onRosterChange }: Props) {
  const t = collaborateCopy.es;
  const [rows, setRows] = useState<VirtualClassRosterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addValue, setAddValue] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const list = await listVirtualClassRoster(supabase, sessionId);
      setRows(list);
      setMessage(null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.rosterLoadError);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId, t.rosterLoadError]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleAdd() {
    const value = addValue.trim();
    if (!value) return;
    setBusyId("add");
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const result = value.includes("@")
        ? await addVirtualClassRosterByEmail(supabase, sessionId, value)
        : await addVirtualClassRosterStudent(supabase, sessionId, value);
      if (!result.ok) {
        if (result.error === "already" || result.error === "email_not_found") {
          setMessage(
            result.error === "email_not_found" ? t.rosterEmailNotFound : t.rosterAlready,
          );
        } else if (result.error === "full") {
          setMessage(t.rosterFull);
        } else {
          setMessage(t.rosterAddError);
        }
        return;
      }
      if ("alreadyEnrolled" in result && result.alreadyEnrolled) {
        setMessage(t.rosterAlready);
      }
      setAddValue("");
      await refresh();
      onRosterChange?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.rosterAddError);
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(studentUserId: string) {
    setBusyId(studentUserId);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await removeVirtualClassRosterStudent(supabase, sessionId, studentUserId);
      await refresh();
      onRosterChange?.();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : t.rosterRemoveError);
    } finally {
      setBusyId(null);
    }
  }

  const seatsLeft = Math.max(0, capacity - enrolled);

  return (
    <Card className="border-teal-400/20 bg-teal-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t.rosterTitle}</CardTitle>
        <CardDescription>
          {t.rosterHint} · {enrolled}/{capacity} {t.rosterEnrolledLabel}
          {seatsLeft > 0 ? ` · ${seatsLeft} ${t.rosterSeatsLeft}` : ` · ${t.rosterFull}`}
        </CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          <input
            className="min-w-[220px] flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
            value={addValue}
            onChange={(e) => setAddValue(e.target.value)}
            placeholder={t.rosterAddPlaceholderEmailOrUuid}
          />
          <Button type="button" size="sm" disabled={busyId === "add"} onClick={() => void handleAdd()} className="gap-1.5">
            {busyId === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <UserPlus className="h-3.5 w-3.5" />}
            {t.rosterAddCta}
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">{t.rosterLoading}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">{t.rosterEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.studentUserId}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm"
              >
                <div>
                  <div className="font-medium text-white">{row.displayName}</div>
                  <div className="text-[11px] text-slate-500">{row.studentUserId.slice(0, 8)}…</div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={busyId === row.studentUserId}
                  onClick={() => void handleRemove(row.studentUserId)}
                  className="gap-1.5 text-rose-200"
                >
                  {busyId === row.studentUserId ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <UserMinus className="h-3.5 w-3.5" />
                  )}
                  {t.rosterRemoveCta}
                </Button>
              </li>
            ))}
          </ul>
        )}

        {message ? <p className="text-xs text-rose-200/90">{message}</p> : null}
      </div>
    </Card>
  );
}
