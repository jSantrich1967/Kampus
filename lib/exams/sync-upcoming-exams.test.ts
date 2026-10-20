import { describe, expect, it } from "vitest";

import { mergeUpcomingExamsIntoProfile } from "@/lib/exams/sync-upcoming-exams";
import type { Exam } from "@/lib/schemas/exams";

function exam(partial: Pick<Exam, "title" | "subject" | "dueDate">): Exam {
  return {
    id: partial.title,
    subject: partial.subject,
    title: partial.title,
    description: "",
    status: "open",
    dueDate: partial.dueDate,
    questions: [{ id: "q1", prompt: "Pregunta" }],
    createdAt: "2026-10-20T00:00:00.000Z",
  };
}

describe("mergeUpcomingExamsIntoProfile", () => {
  it("drops a demo date from a real profile when no real exam shares it", () => {
    const merged = mergeUpcomingExamsIntoProfile(
      [{ subject: "Cálculo", date: "2026-11-01" }],
      [exam({ title: "Parcial (demo)", subject: "Cálculo", dueDate: "2026-11-01" })],
    );
    expect(merged).toEqual([]);
  });

  it("keeps the same demo date while a demo session asks to retain it", () => {
    const merged = mergeUpcomingExamsIntoProfile(
      [{ subject: "Cálculo", date: "2026-11-01" }],
      [exam({ title: "Parcial (demo)", subject: "Cálculo", dueDate: "2026-11-01" })],
      { retainDemoExams: true },
    );
    expect(merged).toEqual([{ subject: "Cálculo", date: "2026-11-01" }]);
  });
});
