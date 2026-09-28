import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  canManageOrganization,
  canSeeOrganizationMember,
  organizationRoleLabel,
} from "@/lib/organizations/membership";

const ANA = "11111111-1111-1111-1111-111111111111";
const LUIS = "22222222-2222-2222-2222-222222222222";

describe("organization membership", () => {
  it("does not let the settings role manage an institution", () => {
    expect(canManageOrganization(null)).toBe(false);
  });

  it("lets an active owner or admin manage the institution", () => {
    expect(canManageOrganization({ role: "owner", status: "active" })).toBe(true);
    expect(canManageOrganization({ role: "admin", status: "active" })).toBe(true);
    expect(canManageOrganization({ role: "teacher", status: "active" })).toBe(false);
    expect(canManageOrganization({ role: "student", status: "active" })).toBe(false);
    expect(canManageOrganization({ role: "owner", status: "suspended" })).toBe(false);
  });

  it("hides another institution and hides classmates from a student", () => {
    expect(
      canSeeOrganizationMember({
        viewerRole: "student",
        viewerStatus: "active",
        viewerUserId: ANA,
        targetUserId: LUIS,
        sameOrganization: false,
      }),
    ).toBe(false);
    expect(
      canSeeOrganizationMember({
        viewerRole: "student",
        viewerStatus: "active",
        viewerUserId: ANA,
        targetUserId: LUIS,
        sameOrganization: true,
      }),
    ).toBe(false);
    expect(
      canSeeOrganizationMember({
        viewerRole: "student",
        viewerStatus: "active",
        viewerUserId: ANA,
        targetUserId: ANA,
        sameOrganization: true,
      }),
    ).toBe(true);
  });

  it("lets an active teacher see classmates and blocks a suspended teacher", () => {
    expect(
      canSeeOrganizationMember({
        viewerRole: "teacher",
        viewerStatus: "active",
        viewerUserId: ANA,
        targetUserId: LUIS,
        sameOrganization: true,
      }),
    ).toBe(true);
    expect(
      canSeeOrganizationMember({
        viewerRole: "teacher",
        viewerStatus: "suspended",
        viewerUserId: ANA,
        targetUserId: LUIS,
        sameOrganization: true,
      }),
    ).toBe(false);
  });

  it("keeps membership writes on the service role", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260928200000_organizations.sql"),
      "utf8",
    );
    expect(sql).toMatch(/role in \('owner', 'admin', 'teacher', 'student'\)/);
    expect(sql).not.toMatch(/super_admin|kampus_admin/i);
    expect(sql).toMatch(/grant select on table public\.organizations to authenticated/);
    expect(sql).toMatch(/grant all on table public\.organizations to service_role/);
    expect(sql).toMatch(/grant select on table public\.organization_members to authenticated/);
    expect(sql).not.toMatch(/grant insert on table public\.organization_members to authenticated/);
    expect(sql).toMatch(/organizations_select_member/);
    expect(sql).toMatch(/organization_members_select_own/);
    expect(sql).toMatch(/organization_members_select_staff/);
    expect(sql).toMatch(/caller_is_organization_staff/);
  });
});

describe("organization role labels", () => {
  it("uses the words a student will read", () => {
    expect(organizationRoleLabel("student")).toBe("Estudiante");
    expect(organizationRoleLabel("teacher")).toBe("Profesor");
  });
});
