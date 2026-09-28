import { beforeEach, describe, expect, it } from "vitest";

import {
  loadDemoVcSessions,
  saveDemoVcSession,
  toggleDemoVcEnrollment,
} from "./virtual-class-demo-storage";

const session = {
  id: "demo_1",
  course: "Historia",
  professor: "Ana",
  topic: "Roma",
  roomLabel: "Aula 1",
  capacity: 30,
  enrolled: 0,
  startsAt: "2026-10-01T15:00:00.000Z",
  joinUrl: null,
  embedVideoUrl: null,
};

describe("virtual class demo storage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps each account's demo class in its own box", () => {
    saveDemoVcSession(session, "ana");
    saveDemoVcSession({ ...session, id: "demo_2", course: "Fisica" }, "luis");
    toggleDemoVcEnrollment("demo_1", "ana");

    expect(loadDemoVcSessions("ana").map((row) => row.course)).toEqual(["Historia"]);
    expect(loadDemoVcSessions("ana")[0]?.isEnrolled).toBe(true);
    expect(loadDemoVcSessions("luis").map((row) => row.course)).toEqual(["Fisica"]);
    expect(loadDemoVcSessions("luis")[0]?.isEnrolled).toBe(false);
  });
});
