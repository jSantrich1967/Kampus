import { describe, expect, it } from "vitest";

import { guideCopy } from "@/lib/i18n/guide";

describe("guide settings copy", () => {
  const settings = guideCopy.es.sections.settings;
  const spoken = [
    settings.objective,
    settings.howItWorks,
    settings.tip,
    ...settings.benefits,
    guideCopy.es.sections.passMode.tip,
  ].join(" ");

  it("names the plan button a student can see", () => {
    expect(spoken).toMatch(/Pasarme a Pro/);
    expect(spoken).toMatch(/materias/i);
  });

  it("does not send a student to controls that are not on the page", () => {
    expect(spoken).not.toMatch(/idioma|rol de prueba|modo prueba premium|Ajustes \(demo\)/i);
  });
});
