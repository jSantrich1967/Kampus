import { beforeEach, describe, expect, it } from "vitest";

import {
  clearCommunitySaved,
  discardLegacyCommunitySaved,
  loadSavedPostIds,
  toggleSavedPostId,
  setCommunitySavedOwner,
} from "./community-saved-storage";

describe("community saved storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setCommunitySavedOwner(null);
  });

  it("keeps each account's saved posts in its own box", () => {
    toggleSavedPostId("post-ana", "ana");
    toggleSavedPostId("post-luis", "luis");

    expect(loadSavedPostIds("ana")).toEqual(["post-ana"]);
    expect(loadSavedPostIds("luis")).toEqual(["post-luis"]);
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.community.saved.v1", JSON.stringify(["post-viejo"]));
    discardLegacyCommunitySaved();
    expect(loadSavedPostIds("ana")).toEqual([]);
  });

  it("clears one account without clearing the other", () => {
    toggleSavedPostId("post-ana", "ana");
    toggleSavedPostId("post-luis", "luis");
    clearCommunitySaved("ana");
    expect(loadSavedPostIds("ana")).toEqual([]);
    expect(loadSavedPostIds("luis")).toEqual(["post-luis"]);
  });
});
