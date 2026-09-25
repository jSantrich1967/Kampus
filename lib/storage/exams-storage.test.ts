import { beforeEach, describe, expect, it } from "vitest";

import {
  clearExamStorage,
  discardLegacyExamStorage,
  examAttemptsStorageKey,
  examsStorageKey,
  loadAttempts,
  loadExams,
  saveAttempts,
  saveExams,
  setExamStorageOwner,
} from "./exams-storage";

const anaExam = {
  id: "exam_ana",
  subject: "Cálculo",
  title: "Parcial de Ana",
  description: "",
  status: "open" as const,
  dueDate: "2026-09-30",
  questions: [{ id: "q1", prompt: "¿Qué es una derivada?" }],
  createdAt: "2026-09-25T12:00:00.000Z",
};

const luisExam = {
  ...anaExam,
  id: "exam_luis",
  title: "Parcial de Luis",
};

const anaAttempt = {
  id: "attempt_ana",
  examId: "exam_ana",
  studentLabel: "Ana",
  answers: { q1: "la pendiente" },
  status: "submitted" as const,
  submittedAt: "2026-09-25T12:00:00.000Z",
};

describe("exam storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setExamStorageOwner(null);
  });

  it("keeps each account's exams and attempts in their own boxes", () => {
    saveExams([anaExam], "ana");
    saveExams([luisExam], "luis");
    saveAttempts([anaAttempt], "ana");

    expect(loadExams("ana").map((exam) => exam.title)).toEqual(["Parcial de Ana"]);
    expect(loadExams("luis").map((exam) => exam.title)).toEqual(["Parcial de Luis"]);
    expect(loadAttempts("ana").map((attempt) => attempt.studentLabel)).toEqual(["Ana"]);
    expect(loadAttempts("luis")).toEqual([]);
    expect(examsStorageKey("ana")).not.toBe(examsStorageKey("luis"));
    expect(examAttemptsStorageKey("ana")).not.toBe(examAttemptsStorageKey("luis"));
  });

  it("does not give the old shared boxes to the next account", () => {
    window.localStorage.setItem("kampus.exams.v1", JSON.stringify([anaExam]));
    window.localStorage.setItem("kampus.examAttempts.v1", JSON.stringify([anaAttempt]));
    discardLegacyExamStorage();
    setExamStorageOwner("luis");

    expect(loadExams()).toEqual([]);
    expect(loadAttempts()).toEqual([]);
    expect(window.localStorage.getItem("kampus.exams.v1")).toBeNull();
    expect(window.localStorage.getItem("kampus.examAttempts.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    saveExams([anaExam], "ana");
    saveExams([luisExam], "luis");
    saveAttempts([anaAttempt], "ana");

    clearExamStorage("ana");

    expect(loadExams("ana")).toEqual([]);
    expect(loadAttempts("ana")).toEqual([]);
    expect(loadExams("luis").map((exam) => exam.title)).toEqual(["Parcial de Luis"]);
  });
});
