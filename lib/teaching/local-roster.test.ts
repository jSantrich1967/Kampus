import { describe, expect, it } from "vitest";

import { appendLocalRosterEntry } from "@/lib/teaching/local-roster";

describe("appendLocalRosterEntry", () => {
  it("keeps two students who share a name as separate rows", () => {
    const first = appendLocalRosterEntry([], {
      id: "ana-1",
      name: "Ana Pérez",
      perQuestion: [5],
      total: 5,
    });
    const second = appendLocalRosterEntry(first, {
      id: "ana-2",
      name: "Ana Pérez",
      perQuestion: [2],
      total: 2,
    });
    expect(second).toHaveLength(2);
    expect(second.map((entry) => entry.id)).toEqual(["ana-1", "ana-2"]);
    expect(second[0]?.total).toBe(5);
    expect(second[1]?.total).toBe(2);
  });
});
