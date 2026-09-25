import { beforeEach, describe, expect, it } from "vitest";

import {
  classCancellationStorageKey,
  clearClassCancellationStorage,
  discardLegacyClassCancellations,
  loadClassCancellations,
  saveClassCancellations,
  setClassCancellationOwner,
} from "./class-cancellation-storage";

const ana = {
  id: "cancel_ana",
  scheduleId: "cls_ana",
  classDate: "2026-09-30",
  reason: "Ana no asiste",
};

const luis = {
  ...ana,
  id: "cancel_luis",
  reason: "Luis no asiste",
};

describe("class cancellation storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setClassCancellationOwner(null);
  });

  it("keeps each account in its own box", () => {
    saveClassCancellations([ana], "ana");
    saveClassCancellations([luis], "luis");

    expect(loadClassCancellations("ana").map((row) => row.reason)).toEqual(["Ana no asiste"]);
    expect(loadClassCancellations("luis").map((row) => row.reason)).toEqual(["Luis no asiste"]);
    expect(classCancellationStorageKey("ana")).not.toBe(classCancellationStorageKey("luis"));
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.classCancellations.v1", JSON.stringify([ana]));
    discardLegacyClassCancellations();
    setClassCancellationOwner("luis");

    expect(loadClassCancellations()).toEqual([]);
    expect(window.localStorage.getItem("kampus.classCancellations.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    saveClassCancellations([ana], "ana");
    saveClassCancellations([luis], "luis");

    clearClassCancellationStorage("ana");

    expect(loadClassCancellations("ana")).toEqual([]);
    expect(loadClassCancellations("luis").map((row) => row.reason)).toEqual(["Luis no asiste"]);
  });
});
