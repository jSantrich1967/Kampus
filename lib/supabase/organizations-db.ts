import type { SupabaseClient } from "@supabase/supabase-js";

import {
  ORGANIZATION_MEMBER_ROLES,
  ORGANIZATION_TYPES,
  type OrganizationMembership,
  type OrganizationMemberRole,
  type OrganizationMemberStatus,
  type OrganizationType,
} from "@/lib/organizations/membership";

interface MembershipRow {
  role: string;
  status: string;
  organizations:
    | {
        id: string;
        name: string;
        slug: string;
        type: string;
        status: string;
      }
    | {
        id: string;
        name: string;
        slug: string;
        type: string;
        status: string;
      }[]
    | null;
}

function missingOrganizationsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42P01" || error.code === "PGRST205" || /organizations|organization_members/.test(message);
}

function asRole(value: string): OrganizationMemberRole | null {
  return ORGANIZATION_MEMBER_ROLES.includes(value as OrganizationMemberRole)
    ? (value as OrganizationMemberRole)
    : null;
}

function asType(value: string): OrganizationType {
  return ORGANIZATION_TYPES.includes(value as OrganizationType) ? (value as OrganizationType) : "other";
}

function asMemberStatus(value: string): OrganizationMemberStatus {
  return value === "suspended" ? "suspended" : "active";
}

/** Memberships of the signed-in user. An empty list when the tables are not applied yet. */
export async function listMyOrganizations(client: SupabaseClient, userId: string): Promise<OrganizationMembership[]> {
  const { data, error } = await client
    .from("organization_members")
    .select("role, status, organizations(id, name, slug, type, status)")
    .eq("user_id", userId);

  if (error) {
    if (missingOrganizationsTable(error)) return [];
    throw error;
  }

  const rows = (data ?? []) as unknown as MembershipRow[];
  const memberships: OrganizationMembership[] = [];
  for (const row of rows) {
    const role = asRole(row.role);
    const org = Array.isArray(row.organizations) ? row.organizations[0] : row.organizations;
    if (!role || !org) continue;
    memberships.push({
      organizationId: org.id,
      name: org.name,
      slug: org.slug,
      type: asType(org.type),
      organizationStatus: org.status === "suspended" ? "suspended" : "active",
      role,
      memberStatus: asMemberStatus(row.status),
    });
  }
  return memberships;
}
