import { beforeEach, describe, expect, it } from "vitest";

import { defaultProfile } from "@/lib/schemas/profile";

import {
  clearProfileStorage,
  discardLegacyProfileStorage,
  loadProfile,
  profileStorageKey,
  saveProfile,
  setProfileStorageOwner,
} from "./kampus-storage";

function profileNamed(name: string) {
  return {
    ...defaultProfile,
    displayName: name,
    major: "Ingeniería",
    semester: "1",
    subjects: ["Cálculo"],
    learningGoals: "Aprobar",
  };
}

describe("profile storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setProfileStorageOwner(null);
  });

  it("keeps each account in its own box", () => {
    saveProfile(profileNamed("Ana"), "ana");
    saveProfile(profileNamed("Luis"), "luis");

    expect(loadProfile("ana").displayName).toBe("Ana");
    expect(loadProfile("luis").displayName).toBe("Luis");
    expect(profileStorageKey("ana")).not.toBe(profileStorageKey("luis"));
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.profile.v1", JSON.stringify(profileNamed("Ana")));
    discardLegacyProfileStorage();
    setProfileStorageOwner("luis");

    expect(loadProfile().displayName).toBe("");
    expect(window.localStorage.getItem("kampus.profile.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    saveProfile(profileNamed("Ana"), "ana");
    saveProfile(profileNamed("Luis"), "luis");

    clearProfileStorage("ana");

    expect(loadProfile("ana").displayName).toBe("");
    expect(loadProfile("luis").displayName).toBe("Luis");
  });
});
