import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStudyStreak,
  discardLegacyStudyStreak,
  loadStudyStreakState,
  recordStudyActivity,
  setStudyStreakOwner,
} from "./study-streak-storage";

describe("study streak storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setStudyStreakOwner(null);
  });

  it("keeps each account's days in its own box", () => {
    recordStudyActivity("2026-09-01", "ana");
    recordStudyActivity("2026-09-02", "luis");

    expect(loadStudyStreakState("ana").activeDates).toEqual(["2026-09-01"]);
    expect(loadStudyStreakState("luis").activeDates).toEqual(["2026-09-02"]);
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem(
      "kampus.studyStreak.v1",
      JSON.stringify({ activeDates: ["2026-09-01"] }),
    );
    discardLegacyStudyStreak();
    expect(loadStudyStreakState("ana").activeDates).toEqual([]);
  });

  it("clears one account without clearing the other", () => {
    recordStudyActivity("2026-09-01", "ana");
    recordStudyActivity("2026-09-02", "luis");
    clearStudyStreak("ana");
    expect(loadStudyStreakState("ana").activeDates).toEqual([]);
    expect(loadStudyStreakState("luis").activeDates).toEqual(["2026-09-02"]);
  });
});
