import { describe, expect, it } from "vitest";

import { anchorCanContinue, anchorForProfile } from "@/lib/onboarding/anchor-step";

const empty = { displayName: "", university: "", major: "", semester: "" };

describe("onboarding anchor step", () => {
  it("asks a student for a program and a period", () => {
    expect(anchorCanContinue("student", empty)).toBe(false);
    expect(anchorCanContinue("learner", { ...empty, major: "Derecho", semester: "2026-1" })).toBe(true);
  });

  it("asks a teacher for a subject, not a student career", () => {
    expect(anchorCanContinue("teacher", { ...empty, major: "Cálculo" })).toBe(true);
    expect(anchorCanContinue("teacher", { ...empty, semester: "2026-1" })).toBe(false);
    expect(anchorForProfile("teacher", { ...empty, major: "Cálculo" }).semester).toBe("Docencia");
  });

  it("asks an institution for its name and does not require a career", () => {
    expect(anchorCanContinue("institution", { ...empty, university: "Colegio Central" })).toBe(true);
    expect(anchorCanContinue("institution", { ...empty, major: "Derecho" })).toBe(false);
    expect(anchorForProfile("institution", { ...empty, university: "Colegio Central" }).major).toBe("Colegio Central");
  });
});
