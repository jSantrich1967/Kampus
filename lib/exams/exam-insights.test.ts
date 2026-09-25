import { describe, expect, it } from "vitest";

import { daysUntilExam } from "./exam-insights";

describe("daysUntilExam", () => {
  it("counts five days from 25 Sep to 30 Sep, including in Caracas", () => {
    // UTC midnight on the 30th is still the 29th in Caracas. The exam date must stay the 30th.
    const utcMidnight = new Date("2026-09-30T00:00:00.000Z");
    const caracasDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Caracas",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(utcMidnight);
    expect(caracasDay).toBe("2026-09-29");

    const afternoonOnThe25th = new Date(2026, 8, 25, 15, 0, 0);
    expect(daysUntilExam("2026-09-30", afternoonOnThe25th)).toBe(5);
  });

  it("returns null for a blank or impossible date", () => {
    expect(daysUntilExam("")).toBeNull();
    expect(daysUntilExam("2026-02-31")).toBeNull();
  });
});
