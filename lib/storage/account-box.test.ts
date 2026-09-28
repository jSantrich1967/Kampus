import { beforeEach, describe, expect, it } from "vitest";

import {
  accountStorageKey,
  clearSharedAccountBoxes,
  discardLegacySharedAccountBoxes,
  readAccountFlag,
  setAccountBoxOwner,
  writeAccountFlag,
} from "./account-box";

describe("account box", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setAccountBoxOwner(null);
  });

  it("keeps a flag in each account's box", () => {
    writeAccountFlag("kampus.wellbeing.serverPush.v1", true, "ana");
    expect(readAccountFlag("kampus.wellbeing.serverPush.v1", "ana")).toBe(true);
    expect(readAccountFlag("kampus.wellbeing.serverPush.v1", "luis")).toBe(false);
    expect(accountStorageKey("kampus.wellbeing.serverPush.v1", "ana")).not.toBe(
      accountStorageKey("kampus.wellbeing.serverPush.v1", "luis"),
    );
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.wellbeing.serverPush.v1", "1");
    discardLegacySharedAccountBoxes();
    expect(readAccountFlag("kampus.wellbeing.serverPush.v1", "ana")).toBe(false);
    expect(window.localStorage.getItem("kampus.wellbeing.serverPush.v1")).toBeNull();
  });

  it("clears one account without clearing the other", () => {
    writeAccountFlag("kampus.authBypassBanner.dismissed.v1", true, "ana");
    writeAccountFlag("kampus.authBypassBanner.dismissed.v1", true, "luis");
    clearSharedAccountBoxes("ana");
    expect(readAccountFlag("kampus.authBypassBanner.dismissed.v1", "ana")).toBe(false);
    expect(readAccountFlag("kampus.authBypassBanner.dismissed.v1", "luis")).toBe(true);
  });
});
