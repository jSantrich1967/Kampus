"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Locale } from "@/lib/i18n/nav";
import { defaultProfile, type UserProfile } from "@/lib/schemas/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchProfileForUser,
  isMeaningfulProfile,
  resolveProfileMerge,
  upsertProfileForUser,
} from "@/lib/supabase/profile-sync";
import {
  clearDiaryStorage,
  discardLegacyDiaryStorage,
  setDiaryStorageOwner,
} from "@/lib/storage/diary-storage";
import { clearDiaryPendingOps, discardLegacyDiaryPendingQueue } from "@/lib/storage/diary-pending-queue";
import {
  clearExamStorage,
  discardLegacyExamStorage,
  setExamStorageOwner,
} from "@/lib/storage/exams-storage";
import {
  clearClassScheduleStorage,
  discardLegacyClassSchedule,
  setClassScheduleOwner,
} from "@/lib/storage/class-schedule-storage";
import {
  clearProfileStorage,
  discardLegacyProfileStorage,
  loadProfile,
  saveProfile,
  setProfileStorageOwner,
} from "@/lib/storage/kampus-storage";
import {
  clearPsychologistChatStorage,
  discardLegacyPsychologistChat,
} from "@/lib/storage/psychologist-chat-storage";

type KampusContextValue = {
  profile: UserProfile;
  setProfile: (next: UserProfile | ((previous: UserProfile) => UserProfile)) => void;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  hydrated: boolean;
  /** Supabase auth user id when session exists and Supabase is configured. */
  authUserId: string | null;
  /** True when profile changes are persisted to Supabase (session + env). */
  profileRemoteSyncActive: boolean;
};

const KampusContext = createContext<KampusContextValue | null>(null);

export function KampusProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile>(defaultProfile);
  const [hydrated, setHydrated] = useState(false);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [locale] = useState<Locale>("es");
  const lastPushedJson = useRef<string>("");
  const authUserIdRef = useRef<string | null>(null);
  const profileOwnerRef = useRef<string | null>(authUserId);
  setDiaryStorageOwner(authUserId);
  setProfileStorageOwner(authUserId);
  setClassScheduleOwner(authUserId);
  setExamStorageOwner(authUserId);

  useEffect(() => {
    discardLegacyPsychologistChat();
    discardLegacyDiaryStorage();
    discardLegacyDiaryPendingQueue();
    discardLegacyProfileStorage();
    discardLegacyClassSchedule();
    discardLegacyExamStorage();
    const stored = loadProfile();
    setProfileState(stored);
    // Render immediately from local storage; Supabase sync runs in the background.
    setHydrated(true);
    if (!isSupabaseConfigured()) {
      setAuthUserId(null);
    }
  }, []);

  useEffect(() => {
    // Demo mode is hermetic: a browser that entered through /demo must never
    // merge a remote (logged-in) profile over the local demo profile.
    if (typeof document !== "undefined" && document.cookie.split(";").some((c) => c.trim() === "kampus_demo=1")) {
      setAuthUserId(null);
      return;
    }
    if (!isSupabaseConfigured()) return;

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const runSync = async (userId: string | null) => {
      if (cancelled) return;
      if (userId === null) {
        setAuthUserId(null);
        return;
      }

      setAuthUserId(userId);
      setProfileStorageOwner(userId);
      setClassScheduleOwner(userId);
      setExamStorageOwner(userId);
      const local = loadProfile(userId);

      try {
        const remoteRaw = await fetchProfileForUser(supabase, userId);
        const remote = remoteRaw ?? defaultProfile;
        const remoteMeaningful = isMeaningfulProfile(remote);
        const merged = resolveProfileMerge(local, remote);
        lastPushedJson.current = JSON.stringify(merged);
        if (cancelled) return;
        setProfileState(merged);
        saveProfile(merged, userId);
        if (!remoteMeaningful && isMeaningfulProfile(local)) {
          await upsertProfileForUser(supabase, userId, merged);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setProfileState(local);
          saveProfile(local, userId);
        }
      }
    };

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const schedule = (userId: string | null) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => void runSync(userId), 60);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextId = session?.user?.id ?? null;
      if (event === "SIGNED_OUT") {
        clearPsychologistChatStorage(authUserIdRef.current);
        clearPsychologistChatStorage(null);
        discardLegacyPsychologistChat();
        clearDiaryStorage(authUserIdRef.current);
        clearDiaryStorage(null);
        clearDiaryPendingOps(authUserIdRef.current);
        clearDiaryPendingOps(null);
        discardLegacyDiaryStorage();
        discardLegacyDiaryPendingQueue();
        clearProfileStorage(authUserIdRef.current);
        clearProfileStorage(null);
        discardLegacyProfileStorage();
        setProfileStorageOwner(null);
        setProfileState(defaultProfile);
        clearClassScheduleStorage(authUserIdRef.current);
        clearClassScheduleStorage(null);
        discardLegacyClassSchedule();
        setClassScheduleOwner(null);
        clearExamStorage(authUserIdRef.current);
        clearExamStorage(null);
        discardLegacyExamStorage();
        setExamStorageOwner(null);
      }
      authUserIdRef.current = nextId;
      schedule(nextId);
    });

    void supabase.auth.getUser().then(({ data: { user } }) => {
      authUserIdRef.current = user?.id ?? authUserIdRef.current;
      schedule(user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (profileOwnerRef.current !== authUserId) {
      profileOwnerRef.current = authUserId;
      return;
    }
    saveProfile(profile, authUserId);
  }, [hydrated, profile, authUserId]);

  useEffect(() => {
    if (!hydrated || !authUserId || !isSupabaseConfigured()) return;
    const json = JSON.stringify(profile);
    if (json === lastPushedJson.current) return;
    const tm = setTimeout(() => {
      const supabase = createSupabaseBrowserClient();
      void upsertProfileForUser(supabase, authUserId, profile)
        .then(() => {
          lastPushedJson.current = json;
        })
        .catch((err) => console.error(err));
    }, 450);
    return () => clearTimeout(tm);
  }, [hydrated, authUserId, profile]);

  const setProfile = useCallback((next: UserProfile | ((previous: UserProfile) => UserProfile)) => {
    setProfileState((prev) => (typeof next === "function" ? (next as (p: UserProfile) => UserProfile)(prev) : next));
  }, []);

  const profileRemoteSyncActive = isSupabaseConfigured() && authUserId !== null;

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      locale,
      setLocale: () => {},
      hydrated,
      authUserId,
      profileRemoteSyncActive,
    }),
    [profile, setProfile, locale, hydrated, authUserId, profileRemoteSyncActive],
  );

  return <KampusContext.Provider value={value}>{children}</KampusContext.Provider>;
}

export function useKampus() {
  const ctx = useContext(KampusContext);
  if (!ctx) {
    throw new Error("useKampus must be used within KampusProvider");
  }
  return ctx;
}
