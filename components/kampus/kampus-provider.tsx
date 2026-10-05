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
import { defaultProfile, type UserProfile, type UserRole } from "@/lib/schemas/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  fetchProfileForUser,
  isMeaningfulProfile,
  resolveProfileMerge,
  profileWithAccountRole,
  upsertProfileForUser,
} from "@/lib/supabase/profile-sync";
import {
  clearDiaryStorage,
  discardLegacyDiaryStorage,
  setDiaryStorageOwner,
} from "@/lib/storage/diary-storage";
import { clearDiaryPendingOps, discardLegacyDiaryPendingQueue } from "@/lib/storage/diary-pending-queue";
import {
  clearClassCancellationStorage,
  discardLegacyClassCancellations,
  setClassCancellationOwner,
} from "@/lib/storage/class-cancellation-storage";
import {
  clearPresentationStorage,
  discardLegacyPresentationStorage,
  setPresentationStorageOwner,
} from "@/lib/storage/presentation-storage";
import { applyScreenRole, loadScreenRole, setScreenRoleOwner } from "@/lib/storage/screen-role-storage";
import {
  clearStudentWorks,
  discardLegacyStudentWorks,
  setStudentWorkOwner,
} from "@/lib/storage/student-work-storage";
import { clearStudyPlan, discardLegacyStudyPlan, setStudyPlanOwner } from "@/lib/storage/study-plan-storage";
import {
  clearTodayMission,
  discardLegacyTodayMission,
  setTodayMissionOwner,
} from "@/lib/storage/today-mission-storage";
import {
  clearStudyStreak,
  discardLegacyStudyStreak,
  setStudyStreakOwner,
} from "@/lib/storage/study-streak-storage";
import {
  clearPassModeIntensity,
  discardLegacyPassModeIntensity,
  setPassModeIntensityOwner,
} from "@/lib/storage/pass-mode-intensity-storage";
import {
  clearPassCloseCycle,
  discardLegacyPassCloseCycle,
  setPassCloseCycleOwner,
} from "@/lib/storage/pass-close-cycle-storage";
import {
  clearSharedAccountBoxes,
  discardLegacySharedAccountBoxes,
  setAccountBoxOwner,
} from "@/lib/storage/account-box";
import {
  clearCommunitySaved,
  discardLegacyCommunitySaved,
  setCommunitySavedOwner,
} from "@/lib/storage/community-saved-storage";
import {
  clearCounselorAlertStorage,
  discardLegacyCounselorAlert,
  setCounselorAlertOwner,
} from "@/lib/wellbeing/counselor-alert-storage";
import {
  clearInstitutionOptIn,
  discardLegacyInstitutionOptIn,
  setInstitutionOptInOwner,
} from "@/lib/wellbeing/institution-pulse-storage";
import {
  clearStudyRoomStorage,
  discardLegacyStudyRooms,
  setStudyRoomOwner,
} from "@/lib/storage/study-room-storage";
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
  /** True cuando el estado de auth inicial ya se resolvió y el perfil se reconcilió. */
  authReady: boolean;
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
  const [authReady, setAuthReady] = useState(false);
  const [syncedUserId, setSyncedUserId] = useState<string | null>(null);
  const [locale] = useState<Locale>("es");
  const lastPushedJson = useRef<string>("");
  const authUserIdRef = useRef<string | null>(null);
  const profileOwnerRef = useRef<string | null>(authUserId);
  const accountRoleRef = useRef<UserRole | null>(null);
  setDiaryStorageOwner(authUserId);
  setProfileStorageOwner(authUserId);
  setClassScheduleOwner(authUserId);
  setExamStorageOwner(authUserId);
  setClassCancellationOwner(authUserId);
  setPresentationStorageOwner(authUserId);
  setStudyPlanOwner(authUserId);
  setStudyRoomOwner(authUserId);
  setCounselorAlertOwner(authUserId);
  setInstitutionOptInOwner(authUserId);
  setScreenRoleOwner(authUserId);
  setStudentWorkOwner(authUserId);
  setTodayMissionOwner(authUserId);
  setStudyStreakOwner(authUserId);
  setPassModeIntensityOwner(authUserId);
  setPassCloseCycleOwner(authUserId);
  setCommunitySavedOwner(authUserId);
  setAccountBoxOwner(authUserId);

  useEffect(() => {
    discardLegacyPsychologistChat();
    discardLegacyDiaryStorage();
    discardLegacyDiaryPendingQueue();
    discardLegacyProfileStorage();
    discardLegacyClassSchedule();
    discardLegacyExamStorage();
    discardLegacyClassCancellations();
    discardLegacyPresentationStorage();
    discardLegacyStudyPlan();
    discardLegacyStudyRooms();
    discardLegacyCounselorAlert();
    discardLegacyInstitutionOptIn();
    discardLegacyStudentWorks();
    discardLegacyTodayMission();
    discardLegacyStudyStreak();
    discardLegacyPassModeIntensity();
    discardLegacyPassCloseCycle();
    discardLegacyCommunitySaved();
    discardLegacySharedAccountBoxes();
    const stored = loadProfile();
    setProfileState(stored);
    // Render immediately from local storage; Supabase sync runs in the background.
    setHydrated(true);
    if (!isSupabaseConfigured()) {
      setAuthUserId(null);
    }
  }, []);

  useEffect(() => {
    // Always observe authentication, including when this browser previously used the demo.
    if (!isSupabaseConfigured()) {
      setAuthReady(true);
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let cancelled = false;

    const runSync = async (userId: string | null) => {
      if (cancelled) return;
      setSyncedUserId(null);
      setAuthReady(false);
      if (userId === null) {
        setAuthUserId(null);
        setAuthReady(true);
        return;
      }

      // A real session takes precedence over the anonymous demo. Never merge its data.
      document.cookie = "kampus_demo=; path=/; max-age=0; SameSite=Lax";
      setProfileStorageOwner(userId);
      setClassScheduleOwner(userId);
      setExamStorageOwner(userId);
      setClassCancellationOwner(userId);
      setPresentationStorageOwner(userId);
      setStudyPlanOwner(userId);
      setStudyRoomOwner(userId);
      setCounselorAlertOwner(userId);
      setInstitutionOptInOwner(userId);
      setScreenRoleOwner(userId);
      setStudentWorkOwner(userId);
      setTodayMissionOwner(userId);
      setStudyStreakOwner(userId);
      setPassModeIntensityOwner(userId);
      setPassCloseCycleOwner(userId);
      setCommunitySavedOwner(userId);
      setAccountBoxOwner(userId);
      const local = loadProfile(userId);
      accountRoleRef.current = null;
      setProfileState(local);
      setAuthUserId(userId);

      try {
        const remoteRaw = await fetchProfileForUser(supabase, userId);
        const remote = remoteRaw ?? defaultProfile;
        const remoteMeaningful = isMeaningfulProfile(remote);
        const merged = resolveProfileMerge(local, remote);
        const accountRole = remoteRaw ? remote.role : merged.role;
        accountRoleRef.current = accountRole;
        const cloud = profileWithAccountRole(merged, accountRole);
        const display = applyScreenRole(cloud, userId);
        lastPushedJson.current = JSON.stringify(cloud);
        if (cancelled) return;
        setProfileState(display);
        saveProfile(cloud, userId);
        setSyncedUserId(userId);
        setAuthReady(true);
        if (!remoteMeaningful && isMeaningfulProfile(cloud)) {
          await upsertProfileForUser(supabase, userId, cloud);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setProfileState(local);
          saveProfile(local, userId);
        }
        setAuthReady(true);
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
        // NOTA: el perfil local NO se borra al cerrar sesión. Está claveado
        // por usuario y el servidor lo reconcilia al entrar; borrarlo
        // obligaba a repetir el onboarding en cada login.
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
        clearClassCancellationStorage(authUserIdRef.current);
        clearClassCancellationStorage(null);
        discardLegacyClassCancellations();
        setClassCancellationOwner(null);
        clearPresentationStorage(authUserIdRef.current);
        clearPresentationStorage(null);
        discardLegacyPresentationStorage();
        setPresentationStorageOwner(null);
        clearStudyPlan(authUserIdRef.current);
        clearStudyPlan(null);
        discardLegacyStudyPlan();
        setStudyPlanOwner(null);
        clearStudyRoomStorage(authUserIdRef.current);
        clearStudyRoomStorage(null);
        discardLegacyStudyRooms();
        setStudyRoomOwner(null);
        clearCounselorAlertStorage(authUserIdRef.current);
        clearCounselorAlertStorage(null);
        discardLegacyCounselorAlert();
        setCounselorAlertOwner(null);
        clearInstitutionOptIn(authUserIdRef.current);
        clearInstitutionOptIn(null);
        discardLegacyInstitutionOptIn();
        setInstitutionOptInOwner(null);
        clearStudentWorks(authUserIdRef.current);
        clearStudentWorks(null);
        discardLegacyStudentWorks();
        setStudentWorkOwner(null);
        clearTodayMission(authUserIdRef.current);
        clearTodayMission(null);
        discardLegacyTodayMission();
        setTodayMissionOwner(null);
        clearStudyStreak(authUserIdRef.current);
        clearStudyStreak(null);
        discardLegacyStudyStreak();
        setStudyStreakOwner(null);
        clearPassModeIntensity(authUserIdRef.current);
        clearPassModeIntensity(null);
        discardLegacyPassModeIntensity();
        setPassModeIntensityOwner(null);
        clearPassCloseCycle(authUserIdRef.current);
        clearPassCloseCycle(null);
        discardLegacyPassCloseCycle();
        setPassCloseCycleOwner(null);
        clearCommunitySaved(authUserIdRef.current);
        clearCommunitySaved(null);
        discardLegacyCommunitySaved();
        setCommunitySavedOwner(null);
        clearSharedAccountBoxes(authUserIdRef.current);
        clearSharedAccountBoxes(null);
        discardLegacySharedAccountBoxes();
        setAccountBoxOwner(null);
        accountRoleRef.current = null;
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
    saveProfile(
      accountRoleRef.current ? profileWithAccountRole(profile, accountRoleRef.current) : profile,
      authUserId,
    );
  }, [hydrated, profile, authUserId]);

  useEffect(() => {
    if (!hydrated || !authUserId || syncedUserId !== authUserId || !isSupabaseConfigured()) return;
    if (loadScreenRole(authUserId) && !accountRoleRef.current) return;
    const cloud = accountRoleRef.current ? profileWithAccountRole(profile, accountRoleRef.current) : profile;
    const json = JSON.stringify(cloud);
    if (json === lastPushedJson.current) return;
    const tm = setTimeout(() => {
      const supabase = createSupabaseBrowserClient();
      void upsertProfileForUser(supabase, authUserId, cloud)
        .then(() => {
          lastPushedJson.current = json;
        })
        .catch((err) => console.error(err));
    }, 450);
    return () => clearTimeout(tm);
  }, [hydrated, authUserId, syncedUserId, profile]);

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
      authReady,
      authUserId,
      profileRemoteSyncActive,
    }),
    [profile, setProfile, locale, hydrated, authReady, authUserId, profileRemoteSyncActive],
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
