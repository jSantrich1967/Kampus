import { beforeEach, describe, expect, it } from "vitest";

import {
  addStudentWork,
  clearStudentWorks,
  discardLegacyStudentWorks,
  loadStudentWorks,
  setStudentWorkOwner,
} from "./student-work-storage";

describe("student work storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setStudentWorkOwner(null);
  });

  it("keeps each account's works in their own box", () => {
    addStudentWork(
      { title: "Informe de Ana", subject: "Historia", dueDate: "2026-10-01", notes: "" },
      "ana",
    );
    addStudentWork(
      { title: "Informe de Luis", subject: "Historia", dueDate: "2026-10-02", notes: "" },
      "luis",
    );
    expect(loadStudentWorks("ana").map((work) => work.title)).toEqual(["Informe de Ana"]);
    expect(loadStudentWorks("luis").map((work) => work.title)).toEqual(["Informe de Luis"]);
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem(
      "kampus.studentWorks.v1",
      JSON.stringify([
        {
          id: "work_old",
          title: "Trabajo viejo",
          subject: "General",
          dueDate: "2026-10-01",
          notes: "",
          createdAt: "2026-09-01T00:00:00.000Z",
        },
      ]),
    );
    discardLegacyStudentWorks();
    expect(loadStudentWorks("ana")).toEqual([]);
  });

  it("clears one account without clearing the other", () => {
    addStudentWork(
      { title: "Informe de Ana", subject: "Historia", dueDate: "2026-10-01", notes: "" },
      "ana",
    );
    addStudentWork(
      { title: "Informe de Luis", subject: "Historia", dueDate: "2026-10-02", notes: "" },
      "luis",
    );
    clearStudentWorks("ana");
    expect(loadStudentWorks("ana")).toEqual([]);
    expect(loadStudentWorks("luis")).toHaveLength(1);
  });
});
