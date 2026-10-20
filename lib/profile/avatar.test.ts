import { describe, expect, it } from "vitest";

import { avatarObjectPath, initialsFor, validateAvatarFile } from "./avatar";

describe("profile avatar helpers", () => {
  it("builds the per-user object path", () => {
    expect(avatarObjectPath("user-123")).toBe("user-123/avatar.jpg");
  });

  it("validates type and size", () => {
    expect(validateAvatarFile({ type: "image/jpeg", size: 500_000 })).toBeNull();
    expect(validateAvatarFile({ type: "image/png", size: 2 * 1024 * 1024 })).toBeNull();
    expect(validateAvatarFile({ type: "image/gif", size: 100 })).toMatch(/JPG, PNG o WebP/);
    expect(validateAvatarFile({ type: "application/pdf", size: 100 })).toMatch(/JPG, PNG o WebP/);
    expect(validateAvatarFile({ type: "image/png", size: 2 * 1024 * 1024 + 1 })).toMatch(/2 MB/);
    expect(validateAvatarFile({ type: "image/png", size: 0 })).toMatch(/vacío/);
  });

  it("derives initials from first and last name", () => {
    expect(initialsFor("Jorge Santrich")).toBe("JS");
    expect(initialsFor("María José Pérez González")).toBe("MG");
    expect(initialsFor("ana")).toBe("A");
    expect(initialsFor("   ")).toBe("?");
    expect(initialsFor("")).toBe("?");
  });
});
