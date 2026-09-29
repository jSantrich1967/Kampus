import { describe, expect, it } from "vitest";

import { submissionFileProblem, submissionObjectPath } from "@/lib/study/submission-file";

describe("submissionFileProblem", () => {
  it("accepts a pdf, a word file, and an image", () => {
    expect(submissionFileProblem({ name: "Informe.pdf", size: 1200 })).toBeNull();
    expect(submissionFileProblem({ name: "tarea.docx", size: 1200 })).toBeNull();
    expect(submissionFileProblem({ name: "foto.PNG", size: 1200 })).toBeNull();
  });

  it("rejects a spreadsheet and an empty file", () => {
    expect(submissionFileProblem({ name: "notas.xlsx", size: 1200 })).toBe("type");
    expect(submissionFileProblem({ name: "vacio.pdf", size: 0 })).toBe("size");
  });

  it("rejects a file over 20 MB", () => {
    expect(submissionFileProblem({ name: "largo.pdf", size: 20 * 1024 * 1024 + 1 })).toBe("size");
  });
});

describe("submissionObjectPath", () => {
  it("keeps the file inside the student folder and drops the original path", () => {
    const path = submissionObjectPath("user-1", "C:\\clases\\Informe Final.pdf", "abc");
    expect(path.startsWith("user-1/abc/")).toBe(true);
    expect(path.endsWith(".pdf")).toBe(true);
    expect(path.includes("\\")).toBe(false);
  });
});
