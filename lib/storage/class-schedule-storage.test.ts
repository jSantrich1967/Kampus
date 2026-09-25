import { beforeEach, describe, expect, it } from "vitest";

import {
  classScheduleStorageKey,
  clearClassScheduleStorage,
  discardLegacyClassSchedule,
  loadClassSchedule,
  saveClassSchedule,
  setClassScheduleOwner,
} from "./class-schedule-storage";

const ana = {
  id: "cls_ana",
  weekday: 1,
  startTime: "09:00",
  endTime: "10:30",
  subject: "Cálculo",
  location: "Aula 2",
  professorName: "",
};

const luis = {
  ...ana,
  id: "cls_luis",
  subject: "Programación",
};

describe("class schedule storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setClassScheduleOwner(null);
  });

  it("keeps each account in its own box", () => {
    saveClassSchedule([ana], "ana");
    saveClassSchedule([luis], "luis");

    expect(loadClassSchedule("ana").map((row) => row.subject)).toEqual(["Cálculo"]);
    expect(loadClassSchedule("luis").map((row) => row.subject)).toEqual(["Programación"]);
    expect(classScheduleStorageKey("ana")).not.toBe(classScheduleStorageKey("luis"));
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.classSchedule.v1", JSON.stringify([ana]));
    discardLegacyClassSchedule();
    setClassScheduleOwner("luis");

    expect(loadClassSchedule()).toEqual([]);
    expect(window.localStorage.getItem("kampus.classSchedule.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    saveClassSchedule([ana], "ana");
    saveClassSchedule([luis], "luis");

    clearClassScheduleStorage("ana");

    expect(loadClassSchedule("ana")).toEqual([]);
    expect(loadClassSchedule("luis").map((row) => row.subject)).toEqual(["Programación"]);
  });
});
