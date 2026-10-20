import { createElement } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TeacherCopilotWorkspace } from "@/components/teaching/teacher-copilot-workspace";
import { InstitutionConsole } from "@/components/institution/institution-console";
import { CramMode } from "@/components/cram/cram-mode";
import { defaultProfile } from "@/lib/schemas/profile";
import { FAQS, PRICING_PLANS } from "@/lib/landing/content";
import { suggestFeedback, suggestScore } from "@/lib/teacher-copilot";

const session = vi.hoisted(() => ({
  role: "teacher" as "teacher" | "institution" | "student",
  authUserId: null as string | null,
}));

vi.mock("@/components/kampus/kampus-provider", () => ({
  useKampus: () => ({
    profile: {
      ...defaultProfile,
      role: session.role,
      major: "Ingeniería",
      semester: "1",
      subjects: ["Cálculo"],
      learningGoals: "Aprender",
    },
    locale: "es",
    hydrated: true,
    authUserId: session.authUserId,
    setProfile: () => undefined,
  }),
}));

vi.mock("@/lib/supabase/env", () => ({ isSupabaseConfigured: () => false }));

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("remaining product gaps", () => {
  it("does not turn answer length into a grade or a publish action", () => {
    expect(suggestScore("")).toMatchObject({ score: null });
    expect(suggestScore("x".repeat(200)).score).toBeNull();
    expect(suggestFeedback("respuesta corta")).toContain("Esto no es una nota");

    session.role = "teacher";
    render(createElement(TeacherCopilotWorkspace));

    expect(screen.getByText("Demostración: no publica")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Publicar a alumnos no está conectado" })).toHaveProperty("disabled", true);
    expect(screen.getByText("Orientación, no es una nota")).toBeTruthy();
    expect(screen.queryByText("/100")).toBeNull();
  });

  it("shows an empty institution series instead of a zero chart", () => {
    session.role = "institution";
    render(createElement(InstitutionConsole));

    expect(screen.getByText("Sin datos. Estos ceros no son una medición de la semana.")).toBeTruthy();
    expect(screen.getByText("Sin datos. No hay temas agregados todavía.")).toBeTruthy();
    expect(screen.getAllByText("Sin datos.").length).toBeGreaterThan(0);
  });

  it("lets a demo browser start one diagnosis and keeps visitors signed out", () => {
    session.role = "student";
    session.authUserId = null;
    window.localStorage.setItem("kampus.demoMode", "1");
    render(createElement(CramMode));

    expect(screen.getByText("Demo acotada")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Empezar diagnóstico/ })).toHaveProperty("disabled", false);

    cleanup();
    window.localStorage.clear();
    document.cookie = "kampus_demo=; path=/; max-age=0";
    render(createElement(CramMode));
    expect(screen.getByText("Inicia sesión")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Empezar diagnóstico/ })).toHaveProperty("disabled", true);
  });

  it("limits the institution offer to a link, not a synced LMS or federated login", () => {
    const institution = PRICING_PLANS.find((plan) => plan.name === "Institución");
    expect(institution?.features.join(" ")).toContain("no sincroniza cursos ni notas");
    expect(institution?.features.join(" ")).toContain("no es un SSO federado");
    const faq = FAQS.find((item) => item.question.includes("colegio o universidad"));
    expect(faq?.answer).toContain("no reemplaza el directorio del colegio");
  });

  it("asks the tutor for one local transfer question that is not a grade", () => {
    const source = readFileSync("app/api/tutor/chat/route.ts", "utf8");
    expect(source).toContain("TRANSFERENCIA");
    expect(source).toContain("No la presentes como nota ni como examen");
  });
});
