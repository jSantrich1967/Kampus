import { createElement } from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProfile, type UserProfile } from "@/lib/schemas/profile";
import { loadProfile, saveProfile, setProfileStorageOwner } from "@/lib/storage/kampus-storage";
import { KampusProvider, useKampus } from "./kampus-provider";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
  fetch: vi.fn(),
  upsert: vi.fn(),
}));
vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: () => true }));
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({ auth: {
    getUser: mocks.getUser,
    onAuthStateChange: mocks.onAuthStateChange,
  } }),
}));
vi.mock("@/lib/supabase/profile-sync", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/supabase/profile-sync")>(),
  fetchProfileForUser: mocks.fetch,
  upsertProfileForUser: mocks.upsert,
}));

function Probe() {
  const { authUserId, profile } = useKampus();
  return createElement("p", null, `${authUserId ?? "anonymous"}:${profile.displayName}`);
}

function profileNamed(displayName: string): UserProfile {
  return { ...defaultProfile, displayName, major: "Ingeniería", semester: "1",
    subjects: ["Cálculo"], learningGoals: "Aprender", university: "School" };
}

describe("demo to authenticated account", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    setProfileStorageOwner(null);
    document.cookie = "kampus_demo=1; path=/";
    saveProfile(profileNamed("DEMO"), null);
    mocks.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
    mocks.upsert.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    document.cookie = "kampus_demo=; path=/; max-age=0";
    setProfileStorageOwner(null);
  });

  it("restores an existing session without uploading demo data during a slow profile read", async () => {
    let finish!: (profile: UserProfile) => void;
    mocks.getUser.mockResolvedValue({ data: { user: { id: "account-a" } } });
    mocks.fetch.mockImplementation(() => new Promise<UserProfile>((resolve) => { finish = resolve; }));
    render(createElement(KampusProvider, null, createElement(Probe)));
    await act(async () => { await vi.advanceTimersByTimeAsync(1000); });
    expect(document.cookie).not.toContain("kampus_demo=1");
    expect(screen.getByText(`account-a:${defaultProfile.displayName}`)).toBeTruthy();
    expect(mocks.upsert).not.toHaveBeenCalled();
    await act(async () => {
      finish(profileNamed("REAL"));
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("account-a:REAL")).toBeTruthy();
    expect(loadProfile("account-a").displayName).toBe("REAL");
    expect(loadProfile(null).displayName).toBe("DEMO");
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("keeps anonymous demo usable and observes a later sign-in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    mocks.fetch.mockResolvedValue(profileNamed("SIGNED IN"));
    render(createElement(KampusProvider, null, createElement(Probe)));
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(screen.getByText("anonymous:DEMO")).toBeTruthy();
    expect(document.cookie).toContain("kampus_demo=1");
    await act(async () => {
      mocks.onAuthStateChange.mock.calls[0][0]("SIGNED_IN", { user: { id: "account-b" } });
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(screen.getByText("account-b:SIGNED IN")).toBeTruthy();
    expect(document.cookie).not.toContain("kampus_demo=1");
    expect(loadProfile("account-b").displayName).toBe("SIGNED IN");
    expect(loadProfile(null).displayName).toBe("DEMO");
  });
});
