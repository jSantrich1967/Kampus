export const ORGANIZATION_TYPES = [
  "university",
  "school",
  "academy",
  "institute",
  "independent_teacher",
  "education_company",
  "other",
] as const;

export const ORGANIZATION_MEMBER_ROLES = ["owner", "admin", "teacher", "student"] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];
export type OrganizationMemberRole = (typeof ORGANIZATION_MEMBER_ROLES)[number];
export type OrganizationMemberStatus = "active" | "suspended";

export interface OrganizationMembership {
  organizationId: string;
  name: string;
  slug: string;
  type: OrganizationType;
  organizationStatus: "active" | "suspended";
  role: OrganizationMemberRole;
  memberStatus: OrganizationMemberStatus;
}

/** The settings role is a screen preference. It never grants an institution. */
export function canManageOrganization(
  membership: { role: OrganizationMemberRole; status: OrganizationMemberStatus } | null,
): boolean {
  if (!membership || membership.status !== "active") return false;
  return membership.role === "owner" || membership.role === "admin";
}

/** A suspended member, and every student, can see only their own row. */
export function canSeeOrganizationMember(input: {
  viewerRole: OrganizationMemberRole;
  viewerStatus: OrganizationMemberStatus;
  viewerUserId: string;
  targetUserId: string;
  sameOrganization: boolean;
}): boolean {
  if (!input.sameOrganization) return false;
  if (input.viewerUserId === input.targetUserId) return true;
  if (input.viewerStatus !== "active") return false;
  return input.viewerRole === "owner" || input.viewerRole === "admin" || input.viewerRole === "teacher";
}

export function organizationRoleLabel(role: OrganizationMemberRole): string {
  switch (role) {
    case "owner":
      return "Propietario";
    case "admin":
      return "Administrador";
    case "teacher":
      return "Profesor";
    case "student":
      return "Estudiante";
  }
}
