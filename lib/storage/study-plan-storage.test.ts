import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStudyPlan,
  discardLegacyStudyPlan,
  loadStudyPlan,
  saveStudyPlan,
  setStudyPlanOwner,
  studyPlanStorageKey,
  type StudyPlan,
} from "./study-plan-storage";

function plan(subjectName: string): StudyPlan {
  return {
    subjects: [{ id: "s1", name: subjectName, examDate: "2026-10-01", topics: ["limites"] }],
    dailyHours: 2,
    sessions: [
      {
        id: "sess1",
        date: "2026-09-26",
        subjectId: "s1",
        subjectName,
        topic: "limites",
        minutes: 30,
        done: false,
      },
    ],
    createdAt: "2026-09-25T12:00:00.000Z",
    updatedAt: "2026-09-25T12:00:00.000Z",
  };
}

const ana = plan("Calculo de Ana");
const luis = plan("Calculo de Luis");

describe("study plan storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setStudyPlanOwner(null);
  });

  it("keeps each account in its own box", () => {
    saveStudyPlan(ana, "ana");
    saveStudyPlan(luis, "luis");

    expect(loadStudyPlan("ana")?.subjects[0]?.name).toBe("Calculo de Ana");
    expect(loadStudyPlan("luis")?.subjects[0]?.name).toBe("Calculo de Luis");
    expect(studyPlanStorageKey("ana")).not.toBe(studyPlanStorageKey("luis"));
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.studyPlan.v1", JSON.stringify(ana));
    discardLegacyStudyPlan();
    setStudyPlanOwner("luis");

    expect(loadStudyPlan()).toBeNull();
    expect(window.localStorage.getItem("kampus.studyPlan.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    saveStudyPlan(ana, "ana");
    saveStudyPlan(luis, "luis");

    clearStudyPlan("ana");

    expect(loadStudyPlan("ana")).toBeNull();
    expect(loadStudyPlan("luis")?.subjects[0]?.name).toBe("Calculo de Luis");
  });
});
