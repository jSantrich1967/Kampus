import { beforeEach, describe, expect, it } from "vitest";

import {
  activePresentationDeckStorageKey,
  clearPresentationStorage,
  createBlankPresentationState,
  discardLegacyPresentationStorage,
  loadActivePresentationDeckId,
  loadPresentation,
  presentationStorageKey,
  saveActivePresentationDeckId,
  savePresentation,
  setPresentationStorageOwner,
  type PresentationState,
} from "./presentation-storage";

function deck(title: string, script: string, code: string): PresentationState {
  return {
    ...createBlankPresentationState(),
    deckTitle: title,
    masterScript: script,
    teamSessionCode: code,
  };
}

const ana = deck("Exposición de Ana", "Guion de Ana", "ANA12345");
const luis = deck("Exposición de Luis", "Guion de Luis", "LUIS6789");

describe("presentation storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setPresentationStorageOwner(null);
  });

  it("keeps each account in its own box", () => {
    savePresentation(ana, "ana");
    savePresentation(luis, "luis");
    saveActivePresentationDeckId("deck-ana", "ana");
    saveActivePresentationDeckId("deck-luis", "luis");

    expect(loadPresentation("ana").masterScript).toBe("Guion de Ana");
    expect(loadPresentation("luis").masterScript).toBe("Guion de Luis");
    expect(loadActivePresentationDeckId("ana")).toBe("deck-ana");
    expect(loadActivePresentationDeckId("luis")).toBe("deck-luis");
    expect(presentationStorageKey("ana")).not.toBe(presentationStorageKey("luis"));
    expect(activePresentationDeckStorageKey("ana")).not.toBe(activePresentationDeckStorageKey("luis"));
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.presentation.v1", JSON.stringify(ana));
    window.localStorage.setItem("kampus.presentation.activeDeckId.v1", "deck-ana");
    discardLegacyPresentationStorage();
    setPresentationStorageOwner("luis");

    expect(loadPresentation().masterScript).toBe("");
    expect(loadActivePresentationDeckId()).toBeNull();
    expect(window.localStorage.getItem("kampus.presentation.v1")).toBeNull();
    expect(window.localStorage.getItem("kampus.presentation.activeDeckId.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    savePresentation(ana, "ana");
    savePresentation(luis, "luis");
    saveActivePresentationDeckId("deck-ana", "ana");
    saveActivePresentationDeckId("deck-luis", "luis");

    clearPresentationStorage("ana");

    expect(loadPresentation("ana").masterScript).toBe("");
    expect(loadActivePresentationDeckId("ana")).toBeNull();
    expect(loadPresentation("luis").masterScript).toBe("Guion de Luis");
    expect(loadActivePresentationDeckId("luis")).toBe("deck-luis");
  });
});
