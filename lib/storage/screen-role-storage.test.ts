import { beforeEach, describe, expect, it } from "vitest";

import { clearScreenRole, loadScreenRole, saveScreenRole, setScreenRoleOwner } from "./screen-role-storage";

describe("screen role storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setScreenRoleOwner(null);
  });

  it("keeps each account's screen choice in its own box", () => {
    saveScreenRole("teacher", "ana");
    saveScreenRole("student", "luis");
    expect(loadScreenRole("ana")).toBe("teacher");
    expect(loadScreenRole("luis")).toBe("student");
  });

  it("clears one account without clearing the other", () => {
    saveScreenRole("institution", "ana");
    saveScreenRole("teacher", "luis");
    clearScreenRole("ana");
    expect(loadScreenRole("ana")).toBeNull();
    expect(loadScreenRole("luis")).toBe("teacher");
  });
});
