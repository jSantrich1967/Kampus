import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStudyRoomStorage,
  discardLegacyStudyRooms,
  loadStudyRoom,
  saveStudyRoom,
  setStudyRoomOwner,
  studyRoomStorageKey,
  type StudyRoomState,
} from "./study-room-storage";

function room(notes: string): StudyRoomState {
  return {
    title: "Sesion",
    agenda: ["Repasar"],
    sharedGoal: "Entender el tema",
    notes,
    focusSeconds: 0,
  };
}

describe("study room storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
    setStudyRoomOwner(null);
  });

  it("keeps each account in its own box for the same room code", () => {
    saveStudyRoom(room("Notas de Ana"), "ABC", "ana");
    saveStudyRoom(room("Notas de Luis"), "ABC", "luis");

    expect(loadStudyRoom("ABC", "ana").notes).toBe("Notas de Ana");
    expect(loadStudyRoom("ABC", "luis").notes).toBe("Notas de Luis");
    expect(studyRoomStorageKey("ABC", "ana")).not.toBe(studyRoomStorageKey("ABC", "luis"));
  });

  it("does not give the old shared room box to the next account", () => {
    window.localStorage.setItem("kampus.studyroom.v1.ABC", JSON.stringify(room("Notas de Ana")));
    discardLegacyStudyRooms();
    setStudyRoomOwner("luis");

    expect(loadStudyRoom("ABC").notes).toBe("");
    expect(window.localStorage.getItem("kampus.studyroom.v1.ABC")).toBeNull();
  });

  it("clears only the account that signed out", () => {
    saveStudyRoom(room("Notas de Ana"), "ABC", "ana");
    saveStudyRoom(room("Otra sala de Ana"), "XYZ", "ana");
    saveStudyRoom(room("Notas de Luis"), "ABC", "luis");

    clearStudyRoomStorage("ana");

    expect(loadStudyRoom("ABC", "ana").notes).toBe("");
    expect(loadStudyRoom("XYZ", "ana").notes).toBe("");
    expect(loadStudyRoom("ABC", "luis").notes).toBe("Notas de Luis");
  });
});
