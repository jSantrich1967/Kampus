import { describe, expect, it } from "vitest";

import { licenseCoversMember } from "@/lib/ai/organization-license";

const now = new Date("2026-09-29T12:00:00.000Z");

const active = {
  status: "active" as const,
  startsAt: "2026-09-01T00:00:00.000Z",
  endsAt: "2026-12-01T00:00:00.000Z",
};

describe("licenseCoversMember", () => {
  it("covers a member with an active seat inside the contract dates", () => {
    expect(licenseCoversMember({ license: active, seatActive: true, now })).toBe(true);
  });

  it("ignores a license when this person has no active seat", () => {
    expect(licenseCoversMember({ license: active, seatActive: false, now })).toBe(false);
  });

  it("ignores a suspended or expired contract", () => {
    expect(
      licenseCoversMember({
        license: { ...active, status: "suspended" },
        seatActive: true,
        now,
      }),
    ).toBe(false);
    expect(
      licenseCoversMember({
        license: { ...active, endsAt: "2026-09-01T00:00:00.000Z" },
        seatActive: true,
        now,
      }),
    ).toBe(false);
  });

  it("ignores a contract that has not started", () => {
    expect(
      licenseCoversMember({
        license: { ...active, startsAt: "2026-10-01T00:00:00.000Z" },
        seatActive: true,
        now,
      }),
    ).toBe(false);
  });
});
