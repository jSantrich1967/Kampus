"use client";

import { Timer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { StudyRoomChatPanel } from "@/components/collaborate/study-room-chat-panel";
import { StudyRoomAssistantPanel } from "@/components/collaborate/study-room-assistant-panel";
import { CollaborateVideoEmbed } from "@/components/collaborate/collaborate-video-embed";
import { CollaborateSubnav } from "@/components/collaborate/collaborate-subnav";
import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  buildStudyRoomHref,
  generateStudyRoomCode,
  normalizeStudyRoomCode,
} from "@/lib/collaborate/study-room-path";
import { useStudyRoomCloudSync } from "@/hooks/use-study-room-cloud-sync";
import { useStudyRoomPresence } from "@/hooks/use-study-room-presence";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import {
  defaultStudyRoomState,
  hasSavedStudyRoom,
  loadStudyRoom,
  saveStudyRoom,
  type StudyRoomState,
} from "@/lib/storage/study-room-storage";

function formatTime(total: number) {
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export function StudyRoomPanel() {
  const { profile, authUserId } = useKampus();
  const t = collaborateCopy.es;
  const searchParams = useSearchParams();
  const router = useRouter();

  const paramRoom = searchParams.get("room");
  const paramTitle = searchParams.get("title")?.trim() ?? "";
  const paramVideo = searchParams.get("video")?.trim() ?? "";

  const roomCode = useMemo(() => {
    const normalized = normalizeStudyRoomCode(paramRoom);
    if (normalized !== "default") return normalized;
    return generateStudyRoomCode();
  }, [paramRoom]);

  const [hydrated, setHydrated] = useState(false);
  const [hasLocalSave, setHasLocalSave] = useState(false);
  const [state, setState] = useState<StudyRoomState>(defaultStudyRoomState);
  const [running, setRunning] = useState(false);
  const roomOwnerRef = useRef<string | null | undefined>(undefined);

  const { cloudActive, syncing, realtime, cloudError } = useStudyRoomCloudSync(
    roomCode,
    hydrated,
    state,
    setState,
    hasLocalSave,
  );
  const { active: presenceActive, peers } = useStudyRoomPresence(roomCode, hydrated);

  useEffect(() => {
    if (normalizeStudyRoomCode(paramRoom) === "default" && roomCode !== "default") {
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("room", roomCode);
      router.replace(buildStudyRoomHref(roomCode, paramTitle || undefined), { scroll: false });
    }
  }, [paramRoom, roomCode, paramTitle, router, searchParams]);

  useEffect(() => {
    const saved = hasSavedStudyRoom(roomCode, authUserId);
    setHasLocalSave(saved);
    const loaded = loadStudyRoom(roomCode, authUserId);
    if (paramTitle && loaded.title === defaultStudyRoomState.title) {
      setState({ ...loaded, title: paramTitle });
    } else {
      setState(loaded);
    }
    setHydrated(true);
  }, [roomCode, paramTitle, authUserId]);

  useEffect(() => {
    if (!hydrated) return;
    if (roomOwnerRef.current !== authUserId) {
      roomOwnerRef.current = authUserId;
      return;
    }
    saveStudyRoom(state, roomCode, authUserId);
  }, [hydrated, state, roomCode, authUserId]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setState((p) => ({ ...p, focusSeconds: p.focusSeconds + 1 }));
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="space-y-10">
      <PageHeader eyebrow={t.eyebrow} title={t.studyRoomPageTitle} description={t.studyRoomPageDescription} />

      <CollaborateSubnav />

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone="accent">{t.studyRoomCodeLabel(roomCode)}</Badge>
        <ShareLinkButton
          pathname="/collaborate/sala-estudio"
          campaign="study_room"
          extra={{ room: roomCode, title: state.title }}
          refHandle={profile.university || "kampus"}
          label={t.studyRoomInvite}
          copiedLabel={t.studyRoomInviteCopied}
        />
      </div>

      <p className="text-sm text-slate-400">{t.studyRoomSharedHint}</p>

      {cloudActive ? (
        cloudError ? (
          <p className="text-xs text-amber-200/80">{t.studyRoomCloudOffline}</p>
        ) : (
          <p className="text-xs text-teal-200/90">
            {syncing
              ? t.studyRoomCloudSyncing
              : realtime
                ? t.studyRoomCloudRealtime
                : t.studyRoomCloudActive}
          </p>
        )
      ) : authUserId ? null : (
        <p className="text-xs text-slate-500">{t.studyRoomCloudLogin}</p>
      )}

      {presenceActive ? (
        <div className="rounded-xl border border-teal-400/15 bg-teal-500/5 px-4 py-3">
          <p className="text-xs font-medium text-teal-100/90">
            {peers.length <= 1 ? t.studyRoomPresenceAlone : t.studyRoomPresenceConnected(peers.length)}
          </p>
          {peers.length > 0 ? (
            <ul className="mt-2 flex flex-wrap gap-2">
              {peers.map((peer) => (
                <li
                  key={peer.userId}
                  className="rounded-full border border-teal-400/20 bg-black/20 px-2.5 py-1 text-[11px] text-teal-50"
                >
                  {peer.displayName}
                  {peer.userId === authUserId ? ` ${t.studyRoomPresenceYou}` : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <StudyRoomChatPanel roomCode={roomCode} hydrated={hydrated} />

      {paramVideo ? (
        <div className="rounded-xl border border-violet-400/20 bg-violet-500/5 p-4">
          <p className="mb-2 text-xs font-medium text-violet-100/90">{t.breakoutVideoInRoomTitle}</p>
          <CollaborateVideoEmbed videoUrl={paramVideo} />
        </div>
      ) : null}

      <StudyRoomAssistantPanel roomCode={roomCode} state={state} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t.studyRoomTitle}</CardTitle>
            <CardDescription>{t.studyRoomHint}</CardDescription>
          </CardHeader>
          <div className="space-y-4 px-5 pb-5">
            <label className="block space-y-1 text-xs text-slate-400">
              {t.studyRoomSessionTitle}
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.title}
                onChange={(e) => setState((p) => ({ ...p, title: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              {t.studyRoomSharedGoal}
              <textarea
                className="min-h-20 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.sharedGoal}
                onChange={(e) => setState((p) => ({ ...p, sharedGoal: e.target.value }))}
              />
            </label>
            <label className="block space-y-1 text-xs text-slate-400">
              {t.studyRoomAgenda}
              <textarea
                className="min-h-28 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
                value={state.agenda.join("\n")}
                onChange={(e) =>
                  setState((p) => ({
                    ...p,
                    agenda: e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean),
                  }))
                }
              />
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <Timer className="h-5 w-5 text-indigo-200" />
                {t.studyRoomFocus}
              </CardTitle>
              <CardDescription>{t.studyRoomFocusHint}</CardDescription>
            </div>
          </CardHeader>
          <div className="space-y-3 px-5 pb-5">
            <div className="text-4xl font-semibold text-white">{formatTime(state.focusSeconds)}</div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant={running ? "danger" : "primary"} onClick={() => setRunning((r) => !r)}>
                {running ? t.studyRoomPause : t.studyRoomStart}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setState((p) => ({ ...p, focusSeconds: 0 }))}>
                {t.studyRoomReset}
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">{t.studyRoomInviteFootnote}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t.studyRoomSharedNotes}</CardTitle>
          <CardDescription>{t.studyRoomSharedNotesHint}</CardDescription>
        </CardHeader>
        <textarea
          className="mx-5 mb-5 min-h-36 w-[calc(100%-2.5rem)] rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm"
          value={state.notes}
          onChange={(e) => setState((p) => ({ ...p, notes: e.target.value }))}
          placeholder={t.studyRoomNotesPlaceholder}
        />
      </Card>
    </div>
  );
}
