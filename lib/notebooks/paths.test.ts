import { describe, expect, it } from "vitest";

import { displaySubjectForSlug, subjectToPathSegment } from "@/lib/notebooks/paths";

describe("displaySubjectForSlug", () => {
  it("uses the accented library name for a plain link", () => {
    expect(subjectToPathSegment("Cálculo")).toBe("calculo");
    expect(displaySubjectForSlug("calculo", ["Cálculo", "Programación"])).toBe("Cálculo");
  });

  it("keeps the link text when no library name matches", () => {
    expect(displaySubjectForSlug("calculo", ["Programación"])).toBeNull();
    expect(displaySubjectForSlug("  ", ["Cálculo"])).toBeNull();
  });
});
