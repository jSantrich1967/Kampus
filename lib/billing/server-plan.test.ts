import { describe, expect, it } from "vitest";

import { planFromEntitlement } from "@/lib/billing/server-plan";

const NOW = new Date("2026-10-20T16:00:00.000Z");

describe("planFromEntitlement", () => {
  it("treats a missing row as free", () => {
    expect(planFromEntitlement(null, NOW)).toBe("free");
  });

  it("does not grant premium without an open expiry", () => {
    expect(planFromEntitlement({ plan: "premium" }, NOW)).toBe("free");
    expect(planFromEntitlement({ plan: "free", expires_at: "2026-12-01T00:00:00.000Z" }, NOW)).toBe("free");
  });

  it("returns free when the premium period has ended, without waiting for a cron", () => {
    expect(
      planFromEntitlement({ plan: "premium", expires_at: "2026-10-01T00:00:00.000Z" }, NOW),
    ).toBe("free");
  });

  it("returns premium only while the period is still open", () => {
    expect(
      planFromEntitlement({ plan: "premium", expires_at: "2026-11-20T00:00:00.000Z" }, NOW),
    ).toBe("premium");
  });
});
