import { beforeEach, describe, expect, it } from "vitest";

import {
  clearPsychologistChatStorage,
  discardLegacyPsychologistChat,
  loadPsychologistChat,
  psychologistChatStorageKey,
  savePsychologistChat,
} from "./psychologist-chat-storage";

const ana = [{ role: "user" as const, content: "hola Ana" }];
const luis = [{ role: "user" as const, content: "hola Luis" }];

describe("psychologist chat storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps each account in its own box", () => {
    savePsychologistChat("ana", ana);
    savePsychologistChat("luis", luis);

    expect(loadPsychologistChat("ana")).toEqual(ana);
    expect(loadPsychologistChat("luis")).toEqual(luis);
    expect(psychologistChatStorageKey("ana")).not.toBe(psychologistChatStorageKey("luis"));
  });

  it("does not give the old shared box to the next account", () => {
    window.localStorage.setItem("kampus.psychologist.chat.v1", JSON.stringify(ana));

    discardLegacyPsychologistChat();

    expect(loadPsychologistChat("luis")).toEqual([]);
    expect(window.localStorage.getItem("kampus.psychologist.chat.v1")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    savePsychologistChat("ana", ana);
    savePsychologistChat("luis", luis);

    clearPsychologistChatStorage("ana");

    expect(loadPsychologistChat("ana")).toEqual([]);
    expect(loadPsychologistChat("luis")).toEqual(luis);
  });
});
