import type { RescueFlashcard } from "@/lib/class-rescue";
import type { PassModePlan } from "@/lib/pass-mode";
import type { UserProfile } from "@/lib/schemas/profile";

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Flashcards aligned with Pass Mode weak topics and priority subjects. */
export function buildPlanFlashcards(profile: UserProfile, plan: PassModePlan): RescueFlashcard[] {
  const top = plan.subjectRisks[0]?.subject ?? profile.subjects[0] ?? "General";
  const weak = profile.weakTopics.slice(0, 3);
  const seed = hashString(`${top}|${weak.join(",")}|${plan.intensity}`);

  const cards: RescueFlashcard[] = [
    {
      front: `¿Idea central de ${top} en una frase?`,
      back: "Definición + ejemplo concreto de clase o apunte.",
    },
    {
      front: `¿Qué suele evaluar el profe en ${top}?`,
      back: "Patrones tipo examen: aplicar, comparar, justificar pasos.",
    },
  ];

  for (const topic of weak) {
    cards.push({
      front: `Explica "${topic}" sin mirar apuntes`,
      back: `En ${top}: mecanismo → ejemplo → error típico que evitar.`,
    });
  }

  const extras: RescueFlashcard[] = [
    {
      front: "¿Memorizar o derivar?",
      back: "Memoriza definiciones; deriva variaciones con reglas base.",
    },
    {
      front: "Trampa común en examen",
      back: "Signos, unidades, supuestos no declarados, saltos de lógica.",
    },
    {
      front: `Repaso express de ${top}`,
      back: "60 s en voz alta: definición → ejemplo → pregunta que aún te asusta.",
    },
  ];

  for (let i = 0; i < extras.length; i += 1) {
    if (cards.length >= 8) break;
    cards.push(extras[(seed + i) % extras.length]!);
  }

  return cards.slice(0, 8);
}

/** Fixed sample deck for onboarding demo — no profile required. */
export function buildDemoFlashcards(): RescueFlashcard[] {
  return [
    {
      front: "¿Qué es repaso activo?",
      back: "Recordar sin mirar apuntes: explicar en voz alta, tarjeta o mini-quiz.",
    },
    {
      front: "¿Cómo prioriza Kampus el mazo?",
      back: "Temas débiles + asignatura con más riesgo en el radar académico.",
    },
    {
      front: "¿Cuándo marcar «Lo sabía»?",
      back: "Cuando puedes explicar la respuesta sin dudar ni mirar notas.",
    },
    {
      front: "Trampa común en examen",
      back: "Signos, unidades, supuestos no declarados, saltos de lógica.",
    },
    {
      front: "Sprint express (60 s)",
      back: "Definición → ejemplo → pregunta que aún te asusta.",
    },
    {
      front: "¿Memorizar o derivar?",
      back: "Memoriza definiciones; deriva variaciones con reglas base.",
    },
  ];
}

export function buildPassModeFlashcardsPath(
  subject: string,
  minutes?: number,
  options?: { fromHub?: boolean; demo?: boolean },
): string {
  const params = new URLSearchParams({ subject });
  if (minutes !== undefined && minutes > 0) params.set("minutes", String(minutes));
  if (options?.fromHub) params.set("from", "hub");
  if (options?.demo) params.set("demo", "1");
  return `/pass-mode/flashcards?${params.toString()}`;
}

export function buildFlashcardsDemoPath(): string {
  return buildPassModeFlashcardsPath("Demo Kampus", 8, { demo: true, fromHub: true });
}
