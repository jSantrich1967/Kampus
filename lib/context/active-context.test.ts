import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { acceptContextSwitch, readStoredContext, selectableContexts } from "@/lib/context/active-context";

const UNIVERSITY_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ACADEMY_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const memberships = [
  {
    organizationId: UNIVERSITY_A,
    name: "Universidad A",
    memberStatus: "active" as const,
    organizationStatus: "active" as const,
  },
  {
    organizationId: ACADEMY_B,
    name: "Academia B",
    memberStatus: "suspended" as const,
    organizationStatus: "active" as const,
  },
];

describe("active context", () => {
  it("accepts the personal context without closing the account", () => {
    const decision = acceptContextSwitch(null, memberships);
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.context).toEqual({ kind: "personal" });
  });

  it("accepts an institution the person actively belongs to", () => {
    const decision = acceptContextSwitch(UNIVERSITY_A, memberships);
    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.context.kind).toBe("organization");
  });

  it("rejects another institution and a suspended membership", () => {
    expect(acceptContextSwitch("cccccccc-cccc-cccc-cccc-cccccccccccc", memberships).ok).toBe(false);
    expect(acceptContextSwitch(ACADEMY_B, memberships).ok).toBe(false);
    expect(selectableContexts(memberships).map((item) => item.organizationId)).toEqual([UNIVERSITY_A]);
  });

  it("does not let a screen role choose an institution by itself", () => {
    const decision = acceptContextSwitch(UNIVERSITY_A, []);
    expect(decision.ok).toBe(false);
  });

  it("returns to Personal when the saved institution is no longer available", () => {
    expect(readStoredContext(ACADEMY_B, memberships)).toEqual({ kind: "personal" });
    expect(readStoredContext(null, memberships)).toEqual({ kind: "personal" });
  });

  it("stores context only for the signed-in user and an active membership", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260928210000_user_context.sql"),
      "utf8",
    );
    expect(sql).toMatch(/user_id = auth\.uid\(\)/);
    expect(sql).toMatch(/caller_has_active_organization/);
    expect(sql).toMatch(/organization_id is null/);
    expect(sql).toMatch(/grant select, insert, update on table public\.user_contexts to authenticated/);
    expect(sql).not.toMatch(/grant all on table public\.user_contexts to authenticated/);
    expect(sql).not.toMatch(/super_admin|kampus_admin/i);
  });
});
