import { describe, expect, it } from "vitest";

import { resolveUserEntitlements } from "@/lib/context/entitlements";

const personal = {
  planId: "pro",
  limits: {
    dailyAiRequests: 120,
    monthlyAiRequests: 3000,
    dailyTokenLimit: 1_000_000,
    monthlyTokenLimit: 15_000_000,
  },
};

const institution = {
  planId: "institution-pro",
  limits: {
    dailyAiRequests: 40,
    monthlyAiRequests: 800,
    dailyTokenLimit: 200_000,
    monthlyTokenLimit: 3_000_000,
  },
};

describe("resolveUserEntitlements", () => {
  it("uses the personal plan when the context is Personal", () => {
    const resolved = resolveUserEntitlements({
      context: { kind: "personal" },
      personalPlan: personal,
      organizationLicense: institution,
    });
    expect(resolved?.source).toBe("personal");
    expect(resolved?.planId).toBe("pro");
  });

  it("uses the institution license only inside that institution", () => {
    const resolved = resolveUserEntitlements({
      context: { kind: "organization", organizationId: "org-a", name: "Universidad A" },
      personalPlan: personal,
      organizationLicense: institution,
    });
    expect(resolved?.source).toBe("organization");
    expect(resolved?.planId).toBe("institution-pro");
  });

  it("keeps the personal plan when the institution has no license yet", () => {
    const resolved = resolveUserEntitlements({
      context: { kind: "organization", organizationId: "org-a", name: "Universidad A" },
      personalPlan: personal,
      organizationLicense: null,
    });
    expect(resolved?.source).toBe("personal");
    expect(resolved?.limits.dailyAiRequests).toBe(120);
  });

  it("does not invent a plan when nothing is stored", () => {
    expect(
      resolveUserEntitlements({
        context: { kind: "personal" },
        personalPlan: null,
        organizationLicense: null,
      }),
    ).toBeNull();
  });
});
