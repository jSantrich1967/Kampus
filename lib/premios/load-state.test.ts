import { describe, expect, it } from "vitest";

import { premiosLoadKind } from "@/lib/premios/load-state";

describe("premiosLoadKind", () => {
  it("asks for a session instead of blaming the connection", () => {
    expect(premiosLoadKind({ status: 401 })).toBe("signin");
  });

  it("keeps a missing table separate from a real failure", () => {
    expect(premiosLoadKind({ status: 200, configured: false })).toBe("inactive");
    expect(premiosLoadKind({ status: 200, configured: true })).toBe("ready");
    expect(premiosLoadKind({ status: 500 })).toBe("offline");
    expect(premiosLoadKind({ status: 0 })).toBe("offline");
  });
});
