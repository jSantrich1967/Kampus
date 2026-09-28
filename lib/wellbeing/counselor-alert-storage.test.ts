import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCounselorAlertStorage,
  discardLegacyCounselorAlert,
  loadCounselorAutoAlertEnabled,
  saveCounselorAutoAlertEnabled,
  setCounselorAlertOwner,
} from "./counselor-alert-storage";

describe("counselor alert storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setCounselorAlertOwner(null);
  });

  it("keeps each account switch in its own box", () => {
    saveCounselorAutoAlertEnabled(true, "ana");
    saveCounselorAutoAlertEnabled(false, "luis");
    expect(loadCounselorAutoAlertEnabled("ana")).toBe(true);
    expect(loadCounselorAutoAlertEnabled("luis")).toBe(false);
  });

  it("drops the old shared switch instead of giving it to the next person", () => {
    window.localStorage.setItem("kampus.wellbeing.counselorAutoAlert.v1", "1");
    discardLegacyCounselorAlert();
    expect(loadCounselorAutoAlertEnabled("ana")).toBe(false);
  });

  it("clears one account without clearing the other", () => {
    saveCounselorAutoAlertEnabled(true, "ana");
    saveCounselorAutoAlertEnabled(true, "luis");
    clearCounselorAlertStorage("ana");
    expect(loadCounselorAutoAlertEnabled("ana")).toBe(false);
    expect(loadCounselorAutoAlertEnabled("luis")).toBe(true);
  });
});
