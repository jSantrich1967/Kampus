"use client";

import { DoorOpen, Loader2, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CollaborateVideoEmbed } from "@/components/collaborate/collaborate-video-embed";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateStudyRoomCode, buildStudyRoomHref } from "@/lib/collaborate/study-room-path";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  deleteVirtualClassBreakoutRoom,
  fetchVirtualClassBreakoutRooms,
  insertVirtualClassBreakoutRoom,
  updateVirtualClassBreakoutVideoUrl,
  type BreakoutRoomRow,
} from "@/lib/supabase/virtual-class-breakout-db";

type Props = {
  sessionId: string;
  isCreator: boolean;
  courseTitle: string;
};

export function VirtualClassBreakoutPanel({ sessionId, isCreator, courseTitle }: Props) {
  const t = collaborateCopy.es;
  const [rows, setRows] = useState<BreakoutRoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [videoDrafts, setVideoDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const data = await fetchVirtualClassBreakoutRooms(supabase, sessionId);
      setRows(data);
      setVideoDrafts(
        Object.fromEntries(data.map((row) => [row.id, row.videoUrl ?? ""])),
      );
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function handleAdd() {
    const trimmed = label.trim();
    if (!trimmed) return;
    setBusy("add");
    try {
      const supabase = createSupabaseBrowserClient();
      const roomCode = generateStudyRoomCode();
      await insertVirtualClassBreakoutRoom(supabase, sessionId, trimmed, roomCode, newVideoUrl);
      setLabel("");
      setNewVideoUrl("");
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleSaveVideo(rowId: string) {
    setBusy(`video-${rowId}`);
    try {
      const supabase = createSupabaseBrowserClient();
      await updateVirtualClassBreakoutVideoUrl(supabase, rowId, videoDrafts[rowId] ?? null);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(id: string) {
    setBusy(id);
    try {
      const supabase = createSupabaseBrowserClient();
      await deleteVirtualClassBreakoutRoom(supabase, id);
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="border-violet-400/20 bg-violet-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <DoorOpen className="h-4 w-4 text-violet-300" aria-hidden />
          {t.breakoutTitle}
        </CardTitle>
        <CardDescription>{t.breakoutHintIter11}</CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {isCreator ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[180px] flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t.breakoutLabelPlaceholder}
              />
              <Button type="button" size="sm" disabled={busy === "add"} onClick={() => void handleAdd()} className="gap-1.5">
                {busy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Plus className="h-3.5 w-3.5" />}
                {t.breakoutAddCta}
              </Button>
            </div>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              placeholder={t.breakoutVideoUrlPlaceholder}
            />
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-slate-400">{t.breakoutLoading}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-400">{t.breakoutEmpty}</p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className="space-y-2 rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium text-white">{row.label}</span>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={buildStudyRoomHref(row.roomCode, `${courseTitle} · ${row.label}`, {
                        video: row.videoUrl ?? undefined,
                      })}
                    >
                      <Button type="button" size="sm" variant="secondary">
                        {t.breakoutEnterCta}
                      </Button>
                    </Link>
                    {isCreator ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy === row.id}
                        onClick={() => void handleRemove(row.id)}
                        className="text-rose-200"
                      >
                        {busy === row.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Trash2 className="h-3.5 w-3.5" />}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {row.videoUrl ? <CollaborateVideoEmbed videoUrl={row.videoUrl} compact /> : null}
                {isCreator ? (
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="min-w-[200px] flex-1 rounded-lg border border-white/10 bg-slate-950/60 px-2 py-1.5 text-xs"
                      value={videoDrafts[row.id] ?? ""}
                      onChange={(e) => setVideoDrafts((prev) => ({ ...prev, [row.id]: e.target.value }))}
                      placeholder={t.breakoutVideoUrlPlaceholder}
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      disabled={busy === `video-${row.id}`}
                      onClick={() => void handleSaveVideo(row.id)}
                      className="gap-1"
                    >
                      {busy === `video-${row.id}` ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                      ) : (
                        <Save className="h-3.5 w-3.5" />
                      )}
                      {t.breakoutVideoSaveCta}
                    </Button>
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
