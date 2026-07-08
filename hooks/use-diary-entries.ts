"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import type { DiaryEntry } from "@/lib/schemas/diary-entry";
import {
  createDiaryEntry,
  deleteDiaryEntry,
  diaryStreakDays,
  hasDiaryEntryToday,
  loadDiaryEntries,
  upsertDiaryEntry,
  type NewDiaryEntryInput,
} from "@/lib/storage/diary-storage";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  deleteDiaryEntryRemote,
  fetchDiaryEntriesRemote,
  insertDiaryEntryRemote,
  updateDiaryEntryRemote,
} from "@/lib/supabase/diary-db";
import { DIARY_CHANGED_EVENT, DIARY_SYNC_COMPLETED_EVENT, notifyDiaryChanged } from "@/lib/wellbeing/diary-events";
import { cacheDiaryEntriesLocally, syncDiaryWithCloud } from "@/lib/wellbeing/diary-sync";
import { isBrowserOnline } from "@/lib/wellbeing/diary-offline-flush";
import { isLocalOnlyDiaryId } from "@/lib/wellbeing/diary-merge";
import { enqueueDiaryPendingOp } from "@/lib/storage/diary-pending-queue";

export function useDiaryEntries() {
  const pathname = usePathname();
  const { hydrated: kampusHydrated, authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);

  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [pendingFlushed, setPendingFlushed] = useState(0);

  const refresh = useCallback(async () => {
    if (!kampusHydrated) return;
    setLoading(true);
    setLoadError(null);
    try {
      if (useCloud) {
        setSyncing(true);
        const supabase = createSupabaseBrowserClient();
        const result = await syncDiaryWithCloud(supabase, authUserId!);
        setEntries(result.entries);
        if (result.pushedCount > 0) {
          setSyncMessage(String(result.pushedCount));
        }
        if (result.flushedPending > 0) {
          setPendingFlushed(result.flushedPending);
        }
      } else {
        setEntries(loadDiaryEntries());
      }
    } catch (e) {
      const cached = loadDiaryEntries();
      setEntries(cached);
      setLoadError(e instanceof Error ? e.message : "No se pudo cargar el diario.");
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [kampusHydrated, useCloud, authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname, authUserId]);

  useEffect(() => {
    const onChanged = () => {
      setEntries(loadDiaryEntries());
    };
    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ pushedCount: number }>).detail;
      if (detail?.pushedCount > 0) setSyncMessage(String(detail.pushedCount));
      setEntries(loadDiaryEntries());
    };
    window.addEventListener(DIARY_CHANGED_EVENT, onChanged);
    window.addEventListener(DIARY_SYNC_COMPLETED_EVENT, onSync);
    return () => {
      window.removeEventListener(DIARY_CHANGED_EVENT, onChanged);
      window.removeEventListener(DIARY_SYNC_COMPLETED_EVENT, onSync);
    };
  }, []);

  useEffect(() => {
    const onOnline = () => void refresh();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [refresh]);

  const streakDays = useMemo(() => diaryStreakDays(entries), [entries]);
  const hasCheckedInToday = useMemo(() => hasDiaryEntryToday(entries), [entries]);

  const saveEntry = useCallback(
    async (input: NewDiaryEntryInput, editingId: string | null) => {
      const now = new Date().toISOString();

      if (!useCloud) {
        if (editingId) {
          const prev = entries.find((e) => e.id === editingId);
          if (!prev) return;
          upsertDiaryEntry({ ...prev, ...input, id: editingId, createdAt: prev.createdAt });
        } else {
          createDiaryEntry(input);
        }
        setEntries(loadDiaryEntries());
        notifyDiaryChanged();
        return;
      }

      let localEntry: DiaryEntry;
      if (editingId) {
        const prev = entries.find((e) => e.id === editingId);
        if (!prev) return;
        localEntry = { ...prev, ...input, id: editingId, createdAt: prev.createdAt, updatedAt: now };
        upsertDiaryEntry(localEntry);
      } else {
        localEntry = createDiaryEntry(input);
      }
      setEntries(loadDiaryEntries());
      notifyDiaryChanged();

      if (!isBrowserOnline()) {
        enqueueDiaryPendingOp(
          editingId
            ? { kind: "update", entry: localEntry, queuedAt: now }
            : { kind: "create", localId: localEntry.id, input, queuedAt: now },
        );
        return;
      }

      try {
        const supabase = createSupabaseBrowserClient();
        if (editingId && !isLocalOnlyDiaryId(editingId)) {
          const updated = await updateDiaryEntryRemote(supabase, authUserId!, localEntry);
          const next = [updated, ...entries.filter((e) => e.id !== editingId)].sort(
            (a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt),
          );
          cacheDiaryEntriesLocally(next);
          setEntries(next);
        } else if (editingId) {
          enqueueDiaryPendingOp({ kind: "update", entry: localEntry, queuedAt: now });
        } else {
          const created = await insertDiaryEntryRemote(supabase, authUserId!, input);
          const next = [created, ...loadDiaryEntries().filter((e) => e.id !== localEntry.id)].sort(
            (a, b) => b.entryDate.localeCompare(a.entryDate) || b.createdAt.localeCompare(a.createdAt),
          );
          cacheDiaryEntriesLocally(next);
          setEntries(next);
        }
        notifyDiaryChanged();
      } catch {
        enqueueDiaryPendingOp(
          editingId
            ? { kind: "update", entry: localEntry, queuedAt: now }
            : { kind: "create", localId: localEntry.id, input, queuedAt: now },
        );
        throw new Error("offline");
      }
    },
    [useCloud, authUserId, entries],
  );

  const removeEntry = useCallback(
    async (id: string) => {
      if (!useCloud) {
        deleteDiaryEntry(id);
        setEntries(loadDiaryEntries());
        notifyDiaryChanged();
        return;
      }

      const now = new Date().toISOString();
      deleteDiaryEntry(id);
      setEntries(loadDiaryEntries());
      notifyDiaryChanged();

      if (!isBrowserOnline()) {
        enqueueDiaryPendingOp({ kind: "delete", id, queuedAt: now });
        return;
      }

      try {
        if (!isLocalOnlyDiaryId(id)) {
          const supabase = createSupabaseBrowserClient();
          await deleteDiaryEntryRemote(supabase, authUserId!, id);
        }
        notifyDiaryChanged();
      } catch {
        enqueueDiaryPendingOp({ kind: "delete", id, queuedAt: now });
        throw new Error("offline");
      }
    },
    [useCloud, authUserId, entries],
  );

  const fetchOnly = useCallback(async () => {
    if (!useCloud) {
      setEntries(loadDiaryEntries());
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const remote = await fetchDiaryEntriesRemote(supabase, authUserId!);
      cacheDiaryEntriesLocally(remote);
      setEntries(remote);
    } catch {
      setEntries(loadDiaryEntries());
    }
  }, [useCloud, authUserId]);

  return {
    entries,
    loading,
    syncing,
    loadError,
    syncMessage,
    pendingFlushed,
    clearSyncMessage: () => setSyncMessage(null),
    refresh,
    fetchOnly,
    saveEntry,
    removeEntry,
    streakDays,
    hasCheckedInToday,
    useCloud,
  };
}
