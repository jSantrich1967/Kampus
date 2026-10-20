import { describe, expect, it } from "vitest";

import { getSafeInternalRedirect } from "@/lib/supabase/safe-redirect";

describe("getSafeInternalRedirect", () => {
  it("keeps internal destinations that the product added after the first allowlist", () => {
    const env = process.env as Record<string, string | undefined>;
    const previous = env.NODE_ENV;
    const strict = env.NEXT_PUBLIC_REDIRECT_STRICT;
    env.NODE_ENV = "production";
    delete env.NEXT_PUBLIC_REDIRECT_STRICT;
    try {
      expect(getSafeInternalRedirect("/pro")).toBe("/pro");
      expect(getSafeInternalRedirect("/tutor")).toBe("/tutor");
      expect(getSafeInternalRedirect("/modo-examen")).toBe("/modo-examen");
      expect(getSafeInternalRedirect("/duelos/ABCD")).toBe("/duelos/ABCD");
      expect(getSafeInternalRedirect("/repasos")).toBe("/repasos");
      expect(getSafeInternalRedirect("https://evil.example")).toBe("/today");
    } finally {
      env.NODE_ENV = previous;
      if (strict === undefined) delete env.NEXT_PUBLIC_REDIRECT_STRICT;
      else env.NEXT_PUBLIC_REDIRECT_STRICT = strict;
    }
  });
});
