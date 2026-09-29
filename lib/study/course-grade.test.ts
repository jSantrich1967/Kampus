import { describe, expect, it } from "vitest";

import { parseCourseGrade } from "@/lib/study/course-grade";

describe("parseCourseGrade", () => {
  it("keeps a blank grade and a score inside 0 to 20", () => {
    expect(parseCourseGrade("   ")).toEqual({ ok: true, grade: null });
    expect(parseCourseGrade("18,5")).toEqual({ ok: true, grade: 18.5 });
    expect(parseCourseGrade("18.55")).toEqual({ ok: true, grade: 18.6 });
    expect(parseCourseGrade("0")).toEqual({ ok: true, grade: 0 });
    expect(parseCourseGrade("20")).toEqual({ ok: true, grade: 20 });
  });

  it("rejects a score outside the scale", () => {
    expect(parseCourseGrade("21")).toEqual({ ok: false });
    expect(parseCourseGrade("-1")).toEqual({ ok: false });
    expect(parseCourseGrade("alta")).toEqual({ ok: false });
  });
});
