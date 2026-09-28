export type ActiveContext =
  | { kind: "personal" }
  | { kind: "organization"; organizationId: string; name: string };

export interface ContextMembership {
  organizationId: string;
  name: string;
  memberStatus: "active" | "suspended";
  organizationStatus: "active" | "suspended";
}

/** Institutions the person can stand in. A suspended seat is not a choice. */
export function selectableContexts(memberships: ContextMembership[]): ContextMembership[] {
  return memberships.filter(
    (membership) => membership.memberStatus === "active" && membership.organizationStatus === "active",
  );
}

/**
 * Accepts Personal, or an organization this person actively belongs to.
 * The settings screen role is not an input: it cannot open an institution.
 */
export function acceptContextSwitch(
  requestedOrganizationId: string | null,
  memberships: ContextMembership[],
): { ok: true; context: ActiveContext } | { ok: false; message: string } {
  if (!requestedOrganizationId) {
    return { ok: true, context: { kind: "personal" } };
  }
  const match = selectableContexts(memberships).find(
    (membership) => membership.organizationId === requestedOrganizationId,
  );
  if (!match) {
    return { ok: false, message: "No perteneces a esa institución." };
  }
  return {
    ok: true,
    context: { kind: "organization", organizationId: match.organizationId, name: match.name },
  };
}

/** A saved institution that is no longer available becomes Personal. */
export function readStoredContext(
  storedOrganizationId: string | null,
  memberships: ContextMembership[],
): ActiveContext {
  const decision = acceptContextSwitch(storedOrganizationId, memberships);
  if (decision.ok) return decision.context;
  return { kind: "personal" };
}
