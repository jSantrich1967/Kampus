import { beforeEach, describe, expect, it } from "vitest";

import {
  clearDiaryStorage,
  diaryStorageKey,
  discardLegacyDiaryStorage,
  loadDiaryEntries,
  saveDiaryEntries,
  setDiaryStorageOwner,
} from "./diary-storage";

const ana = {
  id: "diary_ana",
  entryDate: "2026-09-25",
  createdAt: "2026-09-25T12:00:00.000Z",
  updatedAt: "2026-09-25T12:00:00.000Z",
  mood: "neutral" as const,
  energy: 3,
  gratitude: [],
  body: "nota de Ana",
  intention: "",
  tags: [],
};

const luis = {
  ...ana,
  id: "diary_luis",
  body: "nota de Luis",
};

describe("diary storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setDiaryStorageOwner(null);
  });

  it("keeps each account in its own box", () => {
    saveDiaryEntries([ana], "ana");
    saveDiaryEntries([luis], "luis");

    expect(loadDiaryEntries("ana").map((e) => e.body)).toEqual(["nota de Ana"]);
    expect(loadDiaryEntries("luis").map((e) => e.body)).toEqual(["nota de Luis"]);
    expect(diaryStorageKey("ana")).not.toBe(diaryStorageKey("luis"));
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.diary.v1", JSON.stringify([ana]));
    discardLegacyDiaryStorage();
    setDiaryStorageOwner("luis");

    expect(loadDiaryEntries()).toEqual([]);
    expect(window.localStorage.getItem("kampus.diary.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    saveDiaryEntries([ana], "ana");
    saveDiaryEntries([luis], "luis");

    clearDiaryStorage("ana");

    expect(loadDiaryEntries("ana")).toEqual([]);
    expect(loadDiaryEntries("luis").map((e) => e.body)).toEqual(["nota de Luis"]);
  });
});
