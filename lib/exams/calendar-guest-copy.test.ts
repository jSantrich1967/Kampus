import { describe, expect, it } from "vitest";

import { calendarGuestCopy } from "@/lib/exams/calendar-guest-copy";

describe("calendarGuestCopy", () => {
  it("does not promise that a new exam stays in the browser", () => {
    const text = `${calendarGuestCopy.pageDescription} ${calendarGuestCopy.examHint}`;
    expect(text).toMatch(/inicia sesión/i);
    expect(text).not.toMatch(/datos de exámenes y trabajos quedan en el navegador/i);
  });

  it("keeps works on this device without promising other devices", () => {
    expect(calendarGuestCopy.workHint).toMatch(/este navegador/i);
    expect(calendarGuestCopy.workHint).not.toMatch(/otros dispositivos/i);
  });
});
