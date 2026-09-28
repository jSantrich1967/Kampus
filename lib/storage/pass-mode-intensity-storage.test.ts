import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPassModeIntensity,
  discardLegacyPassModeIntensity,
  loadPassModeIntensity,
  savePassModeIntensity,
  setPassModeIntensityOwner,
} from "./pass-mode-intensity-storage";

describe("pass mode intensity storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPassModeIntensityOwner(null);
  });

  it("keeps each account's intensity in its own box", () => {
    savePassModeIntensity("minimal", true, "ana");
    savePassModeIntensity("full", true, "luis");

    expect(loadPassModeIntensity("ana")).toBe("minimal");
    expect(loadPassModeIntensity("luis")).toBe("full");
  });

  it("does not give the old shared box to the next account", () => {
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    window.localStorage.setItem(
      "kampus.passModeIntensity.v1",
      JSON.stringify({ intensity: "minimal", date, userOverride: true }),
    );
    discardLegacyPassModeIntensity();
    expect(loadPassModeIntensity("ana")).toBe("full");
  });

  it("clears one account without clearing the other", () => {
    savePassModeIntensity("minimal", true, "ana");
    savePassModeIntensity("minimal", true, "luis");
    clearPassModeIntensity("ana");
    expect(loadPassModeIntensity("ana")).toBe("full");
    expect(loadPassModeIntensity("luis")).toBe("minimal");
  });
});
