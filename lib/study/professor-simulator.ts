import type { PassModePlan } from "@/lib/pass-mode";
import type { UserProfile } from "@/lib/schemas/profile";

export type ProfessorSimulatorPrompt = {
  id: string;
  subject: string;
  question: string;
  rubric: string[];
  followUp: string;
};

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Oral-exam style prompts derived from profile + plan (Premium simulator). */
export function buildProfessorSimulatorPrompts(
  profile: UserProfile,
  plan: PassModePlan,
  limit = 3,
): ProfessorSimulatorPrompt[] {
  const subject = plan.subjectRisks[0]?.subject ?? profile.subjects[0] ?? "General";
  const weak = profile.weakTopics[0] ?? "el tema central del temario";
  const seed = hashString(`${subject}|${weak}|${plan.generatedAt}`);

  const templates: Omit<ProfessorSimulatorPrompt, "id" | "subject">[] = [
    {
      question: `Explícalo como si fueras el profesor: ¿por qué ${weak} importa en ${subject}?`,
      rubric: [
        "Definiste el concepto sin circularidad",
        "Diste un ejemplo concreto de clase o apunte",
        "Mencionaste un error típico del alumno",
      ],
      followUp: "¿Qué pregunta de seguimiento haría un profe exigente?",
    },
    {
      question: `Resuelve un caso tipo examen de ${subject} y justifica cada paso en voz alta.`,
      rubric: [
        "Plantear supuestos antes de calcular",
        "Cada paso tiene una razón explícita",
        "Verificaste unidades o coherencia final",
      ],
      followUp: "¿Dónde perderías puntos si fuera oral?",
    },
    {
      question: `Compara dos enfoques de ${subject} que suelen confundirse en ${weak}.`,
      rubric: [
        "Nombraste ambos enfoques con precisión",
        "Explicaste cuándo usar cada uno",
        "Diste un contraejemplo o límite",
      ],
      followUp: "¿Cómo lo preguntaría en un parcial?",
    },
    {
      question: `Un alumno dice: "No entiendo ${weak}". ¿Cómo lo explicas en 90 segundos?`,
      rubric: [
        "Analogía o diagrama mental claro",
        "Un mini-ejemplo resuelto",
        "Cierre con pregunta de comprobación",
      ],
      followUp: "¿Qué material del cuaderno usarías para repasar?",
    },
  ];

  const ordered = [...templates].sort((a, b) => {
    const ia = templates.indexOf(a);
    const ib = templates.indexOf(b);
    return ((seed + ia * 7) % templates.length) - ((seed + ib * 7) % templates.length);
  });

  return ordered.slice(0, limit).map((t, i) => ({
    id: `sim-${i}`,
    subject,
    ...t,
  }));
}

export function buildProfessorSimulatorPath(subject?: string): string {
  if (!subject?.trim()) return "/pass-mode/simulator";
  return `/pass-mode/simulator?subject=${encodeURIComponent(subject.trim())}`;
}
