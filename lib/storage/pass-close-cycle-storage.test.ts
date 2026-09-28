import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPassCloseCycle,
  discardLegacyPassCloseCycle,
  loadPassCloseCycle,
  savePassCloseCycle,
  setPassCloseCycleOwner,
  type PassCloseCycleState,
} from "./pass-close-cycle-storage";

function note(question: string): PassCloseCycleState {
  return {
    date: "2026-09-28",
    errors: ["signo", "", ""],
    classQuestion: question,
  };
}

describe("pass close cycle storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPassCloseCycleOwner(null);
  });

  it("keeps each account's note in its own box", () => {
    savePassCloseCycle(note("Pregunta de Ana"), "ana");
    savePassCloseCycle(note("Pregunta de Luis"), "luis");

    expect(loadPassCloseCycle("ana").classQuestion).toBe("Pregunta de Ana");
    expect(loadPassCloseCycle("luis").classQuestion).toBe("Pregunta de Luis");
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.passCloseCycle.v1", JSON.stringify(note("Pregunta vieja")));
    discardLegacyPassCloseCycle();
    expect(loadPassCloseCycle("ana").classQuestion).toBe("");
  });

  it("clears one account without clearing the other", () => {
    savePassCloseCycle(note("Pregunta de Ana"), "ana");
    savePassCloseCycle(note("Pregunta de Luis"), "luis");
    clearPassCloseCycle("ana");
    expect(loadPassCloseCycle("ana").classQuestion).toBe("");
    expect(loadPassCloseCycle("luis").classQuestion).toBe("Pregunta de Luis");
  });
});
