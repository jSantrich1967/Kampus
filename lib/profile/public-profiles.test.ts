import { describe, expect, it } from "vitest";

import { buildPublicProfileMap } from "./public-profiles";

describe("buildPublicProfileMap", () => {
  it("extracts only the display name and avatar URL from the profile body", () => {
    const map = buildPublicProfileMap([
      {
        id: "u1",
        body: { displayName: "Ana Pérez", avatarUrl: "https://x.test/a.jpg", phone: "+584120000000", plan: "premium" },
      },
      { id: "u2", body: { displayName: "", avatarUrl: "" } },
      { id: "u3", body: null },
      { id: "u4", body: { displayName: "  Luis  ", avatarUrl: 42 } },
    ]);
    expect(map.u1).toEqual({ name: "Ana Pérez", avatarUrl: "https://x.test/a.jpg" });
    // Nunca se filtra el teléfono ni el plan: la forma del objeto es cerrada.
    expect(Object.keys(map.u1).sort()).toEqual(["avatarUrl", "name"]);
    expect(map.u2).toEqual({ name: "Estudiante", avatarUrl: "" });
    expect(map.u3).toEqual({ name: "Estudiante", avatarUrl: "" });
    expect(map.u4).toEqual({ name: "Luis", avatarUrl: "" });
  });
});
