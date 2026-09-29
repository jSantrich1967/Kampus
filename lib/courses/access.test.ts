import { describe, expect, it } from "vitest";

import { canAttachCourseToOrganization, courseVisibleTo } from "@/lib/courses/access";

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
