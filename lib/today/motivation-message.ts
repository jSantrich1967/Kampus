import type { PassModePlan } from "@/lib/pass-mode";
import type { UserProfile } from "@/lib/schemas/profile";
import { daysUntilExam } from "@/lib/exams/exam-insights";

export type MotivationTone = "celebrate" | "encourage" | "nudge" | "calm";

export type MotivationMessage = {
  headline: string;
  body: string;
  tone: MotivationTone;
  ctaLabel?: string;
  ctaHref?: string;
};

export type MotivationInput = {
  profile: UserProfile;
  plan: PassModePlan;
  streakDays: number;
  missionDone: number;
  missionTotal: number;
  studiedToday: boolean;
  materialAlertCount: number;
};

function nearestExam(profile: UserProfile): { subject: string; days: number } | null {
  let best: { subject: string; days: number } | null = null;

  for (const exam of profile.upcomingExams) {
    const days = daysUntilExam(exam.date);
    if (days === null || days < 0) continue;
    if (!best || days < best.days) best = { subject: exam.subject, days };
  }
  return best;
}

export function buildMotivationMessage(input: MotivationInput): MotivationMessage {
  const { profile, plan, streakDays, missionDone, missionTotal, studiedToday, materialAlertCount } = input;
  const allDone = missionTotal > 0 && missionDone === missionTotal;
  const exam = nearestExam(profile);
  const firstBlock = plan.sequence[0];

  if (allDone) {
    return {
      headline: "Plan de hoy completado",
      body:
        streakDays >= 2
          ? `Llevas ${streakDays} días seguidos estudiando con Kampus. Descansa o repasa ligero — mañana recalibramos.`
          : "Completaste todos los bloques. Eso es progreso real, no solo tiempo frente a la pantalla.",
      tone: "celebrate",
      ctaLabel: "Ver Modo aprobar",
      ctaHref: "/pass-mode",
    };
  }

  if (exam && exam.days <= 3 && missionDone === 0) {
    return {
      headline: `Examen de ${exam.subject} muy cerca`,
      body: `Quedan ${exam.days} día${exam.days === 1 ? "" : "s"}. Un solo bloque hoy (${firstBlock?.minutes ?? 25} min) reduce la ansiedad y te da claridad.`,
      tone: "nudge",
      ctaLabel: "Empezar bloque",
      ctaHref: "/pass-mode",
    };
  }

  if (streakDays >= 5 && studiedToday) {
    return {
      headline: `${streakDays} días de racha`,
      body: `Tu preparación está al ${plan.preparednessScore}%. Mantén el ritmo: ${missionDone}/${missionTotal} bloques hechos hoy.`,
      tone: "celebrate",
    };
  }

  if (streakDays >= 2 && !studiedToday) {
    return {
      headline: `Racha de ${streakDays} días en juego`,
      body: "Aún no marcaste un bloque hoy. 25 minutos bastan para no romper la cadena.",
      tone: "nudge",
      ctaLabel: "Ver misión de hoy",
      ctaHref: "#today-mission",
    };
  }

  if (materialAlertCount >= 2 && missionDone === 0) {
    return {
      headline: "Material pendiente en varios cuadernos",
      body: "Sube apuntes reales antes del quiz — así las preguntas salen de tus clases, no de contenido genérico.",
      tone: "nudge",
      ctaLabel: "Mis cuadernos",
      ctaHref: "/study/library",
    };
  }

  if (missionDone > 0 && missionDone < missionTotal) {
    const left = missionTotal - missionDone;
    return {
      headline: "Vas por buen camino",
      body: `Te faltan ${left} bloque${left === 1 ? "" : "s"} para cerrar el día. ${plan.preparednessScore}% de preparación estimada.`,
      tone: "encourage",
    };
  }

  if (plan.preparednessScore >= 70 && streakDays === 0) {
    return {
      headline: "Buen nivel de partida",
      body: "Tu perfil indica buena base. Empieza la racha hoy con el primer bloque de tu misión.",
      tone: "encourage",
      ctaLabel: "Empezar ahora",
      ctaHref: "#today-mission",
    };
  }

  if (exam && exam.days <= 10) {
    return {
      headline: `${exam.subject} en ${exam.days} días`,
      body: profile.weakTopics.length
        ? `Refuerza ${profile.weakTopics.slice(0, 2).join(" y ")} con bloques cortos esta semana.`
        : "Divide la semana en bloques pequeños — mejor constancia que maratones.",
      tone: "calm",
    };
  }

  return {
    headline: streakDays > 0 ? `${streakDays} día${streakDays === 1 ? "" : "s"} de estudio activo` : "Empieza tu racha hoy",
    body:
      streakDays > 0
        ? `${missionDone}/${missionTotal} bloques completados. Cada día con al menos un bloque suma.`
        : "Marca un bloque de tu misión como hecho y Kampus contará el día. Pequeños pasos, resultados sólidos.",
    tone: streakDays > 0 ? "encourage" : "calm",
    ctaLabel: missionDone === 0 ? "Ver misión" : undefined,
    ctaHref: missionDone === 0 ? "#today-mission" : undefined,
  };
}
