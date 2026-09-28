import { beforeEach, describe, expect, it } from "vitest";

import {
  clearTodayMission,
  discardLegacyTodayMission,
  loadTodayMission,
  saveTodayMission,
  setTodayMissionOwner,
} from "./today-mission-storage";

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

describe("today mission storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setTodayMissionOwner(null);
  });

  it("keeps each account's mission in its own box", () => {
    const date = todayKey();
    saveTodayMission({ date, completedBlockIds: ["quiz"] }, "ana");
    saveTodayMission({ date, completedBlockIds: ["flashcards"] }, "luis");

    expect(loadTodayMission("ana").completedBlockIds).toEqual(["quiz"]);
    expect(loadTodayMission("luis").completedBlockIds).toEqual(["flashcards"]);
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem(
      "kampus.todayMission.v1",
      JSON.stringify({ date: todayKey(), completedBlockIds: ["quiz"] }),
    );
    discardLegacyTodayMission();
    expect(loadTodayMission("ana").completedBlockIds).toEqual([]);
  });

  it("clears one account without clearing the other", () => {
    const date = todayKey();
    saveTodayMission({ date, completedBlockIds: ["quiz"] }, "ana");
    saveTodayMission({ date, completedBlockIds: ["flashcards"] }, "luis");
    clearTodayMission("ana");
    expect(loadTodayMission("ana").completedBlockIds).toEqual([]);
    expect(loadTodayMission("luis").completedBlockIds).toEqual(["flashcards"]);
  });
});
