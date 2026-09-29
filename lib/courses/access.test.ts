import { describe, expect, it } from "vitest";

import {
  canAttachCourseToOrganization,
  courseVisibleTo,
  enrollmentDisplayName,
  joinCourseDecision,
  normalizeCourseCode,
  studentCourseListStatus,
} from "@/lib/courses/access";

describe("courseVisibleTo", () => {
  it("lets the teacher see an archived course", () => {
    expect(
      courseVisibleTo({
        viewerId: "teacher",
        teacherId: "teacher",
        courseStatus: "archived",
        enrollmentStatus: null,
      }),
    ).toBe(true);
  });

  it("lets an active student see an open course", () => {
    expect(
      courseVisibleTo({
        viewerId: "student",
        teacherId: "teacher",
        courseStatus: "active",
        enrollmentStatus: "active",
      }),
    ).toBe(true);
  });

  it("hides the course from someone who is not enrolled", () => {
    expect(
      courseVisibleTo({
        viewerId: "other",
        teacherId: "teacher",
        courseStatus: "active",
        enrollmentStatus: null,
      }),
    ).toBe(false);
  });

  it("hides an archived course from a student", () => {
    expect(
      courseVisibleTo({
        viewerId: "student",
        teacherId: "teacher",
        courseStatus: "archived",
        enrollmentStatus: "active",
      }),
    ).toBe(false);
  });
});

describe("canAttachCourseToOrganization", () => {
  it("allows a personal course", () => {
    expect(
      canAttachCourseToOrganization({
        organizationId: null,
        membershipRole: null,
        membershipStatus: null,
        organizationStatus: null,
      }),
    ).toBe(true);
  });

  it("allows an active teacher of that institution", () => {
    expect(
      canAttachCourseToOrganization({
        organizationId: "org-a",
        membershipRole: "teacher",
        membershipStatus: "active",
        organizationStatus: "active",
      }),
    ).toBe(true);
  });

  it("rejects a student seat and a suspended institution", () => {
    expect(
      canAttachCourseToOrganization({
        organizationId: "org-a",
        membershipRole: "student",
        membershipStatus: "active",
        organizationStatus: "active",
      }),
    ).toBe(false);
    expect(
      canAttachCourseToOrganization({
        organizationId: "org-a",
        membershipRole: "owner",
        membershipStatus: "active",
        organizationStatus: "suspended",
      }),
    ).toBe(false);
  });
});

describe("normalizeCourseCode", () => {
  it("accepts a code with spaces or a dash", () => {
    expect(normalizeCourseCode("ab23-cd45")).toBe("AB23CD45");
  });

  it("rejects a short code and an ambiguous letter", () => {
    expect(normalizeCourseCode("AB23")).toBeNull();
    expect(normalizeCourseCode("AB23CD4O")).toBeNull();
  });
});

describe("joinCourseDecision", () => {
  it("enrolls a new student in an open course", () => {
    expect(
      joinCourseDecision({
        codeMatches: true,
        courseStatus: "active",
        viewerIsTeacher: false,
        enrollmentStatus: null,
      }),
    ).toBe("join");
  });

  it("keeps a student who is already enrolled", () => {
    expect(
      joinCourseDecision({
        codeMatches: true,
        courseStatus: "active",
        viewerIsTeacher: false,
        enrollmentStatus: "active",
      }),
    ).toBe("already");
  });

  it("rejects an archived course, the teacher, and a suspended seat", () => {
    expect(
      joinCourseDecision({
        codeMatches: true,
        courseStatus: "archived",
        viewerIsTeacher: false,
        enrollmentStatus: null,
      }),
    ).toBe("rejected");
    expect(
      joinCourseDecision({
        codeMatches: true,
        courseStatus: "active",
        viewerIsTeacher: true,
        enrollmentStatus: null,
      }),
    ).toBe("rejected");
    expect(
      joinCourseDecision({
        codeMatches: false,
        courseStatus: "active",
        viewerIsTeacher: false,
        enrollmentStatus: null,
      }),
    ).toBe("rejected");
  });
});

describe("studentCourseListStatus", () => {
  it("keeps an active seat and a suspended seat on an open course", () => {
    expect(studentCourseListStatus({ courseStatus: "active", enrollmentStatus: "active" })).toBe("active");
    expect(studentCourseListStatus({ courseStatus: "active", enrollmentStatus: "suspended" })).toBe("suspended");
  });

  it("hides the course once the teacher archives it", () => {
    expect(studentCourseListStatus({ courseStatus: "archived", enrollmentStatus: "suspended" })).toBeNull();
  });
});

describe("enrollmentDisplayName", () => {
  it("keeps a real name and falls back when the profile is empty", () => {
    expect(enrollmentDisplayName("  Ana Pérez  ")).toBe("Ana Pérez");
    expect(enrollmentDisplayName("   ")).toBe("Estudiante");
    expect(enrollmentDisplayName(null)).toBe("Estudiante");
  });
});
