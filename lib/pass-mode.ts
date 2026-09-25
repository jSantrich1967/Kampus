import { daysUntilCalendarDate } from "@/lib/calendar/local-iso-date";
import type { UserProfile } from "@/lib/schemas/profile";
import { buildCommunitySubjectHref } from "@/lib/community/channels";

export type RiskLevel = "low" | "medium" | "high";

export type SubjectRisk = {
  subject: string;
  risk: RiskLevel;
  score: number;
  reasons: string[];
  nextAction: string;
};

export type StudyBlock = {
  id: string;
  title: string;
  subject: string;
  minutes: number;
  focus: string;
  priority: "P1" | "P2" | "P3";
  rationale: string;
};

export type PassModePlan = {
  generatedAt: string;
  intensity: PassPlanIntensity;
  planLabel: string;
  dailyBudgetMinutes: number;
  overloadNote: string | null;
  preparednessScore: number; // 0-100
  sequence: StudyBlock[];
  subjectRisks: SubjectRisk[];
  nextBestActions: string[];
};

export type PassPlanIntensity = "full" | "minimal";

export type BuildPassModePlanOptions = {
  intensity?: PassPlanIntensity;
};

const MINIMAL_BUDGET_MINUTES = 15;

function daysUntil(isoDate: string): number | null {
  return daysUntilCalendarDate(isoDate);
}

function teacherRiskReasons(
  nearest: number | undefined,
  profile: UserProfile,
  weakLinked: boolean,
): string[] {
  const reasons: string[] = [];
  if (nearest !== undefined) {
    if (nearest <= 3) {
      reasons.push("Evaluación muy próxima: alinea rúbrica, entregas y mensaje al alumnado.");
    } else if (nearest <= 10) {
      reasons.push("Examen en el horizonte cercano: conviene checkpoint de preparación y criterios explícitos.");
    } else if (nearest <= 21) {
      reasons.push("Fecha de evaluación visible: anticipa instrucciones y coherencia de evaluación.");
    }
  } else {
    reasons.push("Sin fecha de examen registrada para esta materia — revisa el calendario académico.");
  }
  if (profile.weakTopics.length > 0) {
    reasons.push("Hay temas marcados como densos: planifica refuerzo, ejemplo guiado o material de apoyo.");
  }
  if (weakLinked) {
    reasons.push("Los temas densos conectan con esta materia — prioriza una aclaración focalizada en clase.");
  }
  if (profile.missedClassesApprox >= 4) {
    reasons.push("Muchas clases perdidas en el perfil de referencia — valora recuperación o avisos al alumnado.");
  }
  if (reasons.length === 0) {
    reasons.push("Rutina estable: mantén canales claros de expectativas.");
  }
  return reasons;
}

function riskForSubject(
  subject: string,
  profile: UserProfile,
): { risk: RiskLevel; score: number; reasons: string[]; nextAction: string } {
  const exams = profile.upcomingExams.filter((e) => e.subject === subject);
  let score = 35;

  const nearest = exams
    .map((e) => daysUntil(e.date))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)[0];

  if (nearest !== undefined) {
    if (nearest <= 3) {
      score += 45;
    } else if (nearest <= 10) {
      score += 28;
    } else if (nearest <= 21) {
      score += 12;
    }
  }

  if (profile.weakTopics.length > 0) {
    score += Math.min(18, profile.weakTopics.length * 4);
  }
  const weakLinked = profile.weakTopics.some(
    (t) =>
      subject.toLowerCase().includes(t.toLowerCase()) ||
      t.toLowerCase().includes(subject.toLowerCase()),
  );
  if (weakLinked) {
    score += 10;
  }

  if (profile.missedClassesApprox >= 4) {
    score += 10;
  }

  let risk: RiskLevel = "low";
  if (score >= 70) risk = "high";
  else if (score >= 45) risk = "medium";

  if (profile.role === "teacher") {
    const reasons = teacherRiskReasons(nearest, profile, weakLinked);
    const nextAction =
      risk === "high"
        ? "Abre el Copiloto docente, revisa entregas pendientes y deja feedback accionable en la materia con más presión."
        : risk === "medium"
          ? "Agenda repaso o evaluación formativa; confirma fechas y criterios en el flujo de exámenes."
          : "Mantén criterios claros: un recordatorio breve de rúbrica o expectativas suele bastar esta semana.";
    return { risk, score: Math.min(100, Math.round(score)), reasons, nextAction };
  }

  const reasons: string[] = [];
  if (nearest !== undefined) {
    if (nearest <= 3) {
      reasons.push("La ventana de examen está muy cerca.");
    } else if (nearest <= 10) {
      reasons.push("El examen próximo aumenta la presión.");
    } else if (nearest <= 21) {
      reasons.push("El examen ya aparece en el horizonte.");
    }
  } else {
    reasons.push("No hay fecha de examen registrada — asumimos mantenimiento constante.");
  }

  if (profile.weakTopics.length > 0) {
    reasons.push("Marcaste temas débiles — la recuperación espaciada te ayudará.");
  }
  if (weakLinked) {
    reasons.push("Los temas débiles conectan con esta materia — prioriza repeticiones de reparación.");
  }

  if (profile.missedClassesApprox >= 4) {
    reasons.push("Las clases perdidas se acumulan — un kit de estudios del cuaderno cierra la brecha.");
  }

  const nextAction =
    risk === "high"
      ? "Ejecuta el kit de estudios del cuaderno con el material más reciente y luego practica 20 tarjetas."
      : risk === "medium"
        ? "Haz 25 minutos de repaso enfocado + 10 preguntas de recuerdo rápido."
        : "Mantén con un repaso ligero y un quiz para sostener la confianza.";

  return { risk, score: Math.min(100, Math.round(score)), reasons, nextAction };
}

export type TeacherFocusBlock = {
  title: string;
  subject: string;
  focus: string;
  priority: "P1" | "P2" | "P3";
  rationale: string;
};

export function buildTeacherFocusBlock(profile: UserProfile): TeacherFocusBlock | null {
  if (profile.role !== "teacher") return null;
  const sorted = [...buildSubjectRisks(profile)].sort((a, b) => b.score - a.score);
  const top = sorted[0];
  const subject = top?.subject ?? profile.subjects[0] ?? "General";
  const riskLevel = top?.risk ?? "low";
  const title =
    riskLevel === "high"
      ? "Revisión prioritaria de evaluación y feedback"
      : riskLevel === "medium"
        ? "Alineación de criterios y próxima sesión"
        : "Mantenimiento de claridad y expectativas";
  const focus = "Rúbrica, entregas y mensaje claro al estudiante";
  const rationale =
    riskLevel === "high"
      ? `Concentra un bloque en "${subject}": hay más presión de fechas o brechas — prioriza retroalimentación accionable.`
      : riskLevel === "medium"
        ? `Organiza un repaso o micro-evaluación en "${subject}" para sostener el ritmo del cohorte.`
        : `Mantén el hilo didáctico en "${subject}" con un recordatorio breve de criterios o cronograma.`;
  const priority: "P1" | "P2" | "P3" =
    riskLevel === "high" ? "P1" : riskLevel === "medium" ? "P2" : "P3";
  return { title, subject, focus, priority, rationale };
}

export function buildSubjectRisks(profile: UserProfile): SubjectRisk[] {
  return profile.subjects.map((subject) => {
    const r = riskForSubject(subject, profile);
    return {
      subject,
      risk: r.risk,
      score: r.score,
      reasons: r.reasons,
      nextAction: r.nextAction,
    };
  });
}

/**
 * Deterministic "Pass Mode" planner — designed to feel intelligent while staying explainable.
 * Replace with model + calendar integration when backend exists.
 */
export function buildPassModePlan(
  profile: UserProfile,
  options?: BuildPassModePlanOptions,
): PassModePlan {
  const intensity = options?.intensity ?? "full";
  const subjectRisks = buildSubjectRisks(profile).sort((a, b) => b.score - a.score);

  const top = subjectRisks[0]?.subject ?? profile.subjects[0] ?? "General";
  const second = subjectRisks[1]?.subject ?? profile.subjects[1] ?? top;

  const avgRisk =
    subjectRisks.reduce((acc, s) => acc + s.score, 0) / Math.max(1, subjectRisks.length);
  const preparednessScore = Math.max(12, Math.min(92, Math.round(88 - avgRisk * 0.35)));

  if (intensity === "minimal") {
    const allocated = [4, 6, 5] as const;
    const sequence: StudyBlock[] = [
      {
        id: "flashcards",
        title: "Sprint de tarjetas",
        subject: top,
        minutes: allocated[0],
        focus: profile.weakTopics.slice(0, 2).join(", ") || "Conceptos clave del cuaderno",
        priority: "P1",
        rationale: "Plan mínimo de 15 min: repaso activo antes del quiz.",
      },
      {
        id: "deep",
        title: "Recuperación focalizada",
        subject: top,
        minutes: allocated[1],
        focus: profile.weakTopics[0] ?? "Tu punto débil principal",
        priority: "P1",
        rationale: "Un solo bloque profundo — calidad sobre cantidad.",
      },
      {
        id: "quiz",
        title: "Quiz de presión express",
        subject: top,
        minutes: allocated[2],
        focus: "Preguntas cronometradas desde apuntes",
        priority: "P1",
        rationale: "Cierra con práctica real bajo presión.",
      },
    ];

    return {
      generatedAt: new Date().toISOString(),
      intensity,
      planLabel: `Plan mínimo · ${MINIMAL_BUDGET_MINUTES} min`,
      dailyBudgetMinutes: MINIMAL_BUDGET_MINUTES,
      overloadNote:
        profile.weeklyAvailabilityHours * 60 < profile.subjects.length * 90
          ? "Carga alta detectada — usamos el plan mínimo viable de hoy."
          : null,
      preparednessScore,
      sequence,
      subjectRisks,
      nextBestActions: [
        `Tarjetas de 4 min sobre ${top} y tus temas débiles.`,
        `Quiz express de ${allocated[2]} min con material del cuaderno.`,
        "Premium: simulador oral estilo profesor para practicar explicación.",
      ],
    };
  }

  const dailyBudgetMinutes = Math.round((profile.weeklyAvailabilityHours * 60) / 7);
  const cap = Math.max(45, Math.min(180, dailyBudgetMinutes));

  const overloadNote =
    profile.weeklyAvailabilityHours * 60 < profile.subjects.length * 90
      ? "Tu carga de materias supera tus minutos disponibles: acortamos sesiones y priorizamos exámenes."
      : null;

  const weights = [0.14, 0.28, 0.12, 0.22, 0.12, 0.12] as const;
  const allocated = weights.map((w) => Math.max(8, Math.round(cap * w)));
  const drift = cap - allocated.reduce((a, b) => a + b, 0);
  allocated[allocated.length - 1] = Math.max(8, allocated[allocated.length - 1] + drift);

  const sequence: StudyBlock[] = [
    {
      id: "warmup",
      title: "Calentamiento de confianza",
      subject: top,
      minutes: allocated[0],
      focus: "Definiciones clave + un ejemplo resuelto",
      priority: "P1",
      rationale: "Empieza con la materia de mayor presión para reducir la ansiedad desde temprano.",
    },
    {
      id: "deep",
      title: "Bloque de recuperación profunda",
      subject: top,
      minutes: allocated[1],
      focus: profile.weakTopics[0] ?? "Conceptos con más errores en la última práctica",
      priority: "P1",
      rationale: "El recuerdo activo vence la relectura: este bloque apunta a tu punto débil.",
    },
    {
      id: "flashcards",
      title: "Sprint de tarjetas",
      subject: top,
      minutes: allocated[2],
      focus: profile.weakTopics.slice(0, 2).join(", ") || "Repaso activo del cuaderno",
      priority: "P2",
      rationale: "Tarjetas cortas ancladas a tus temas débiles del plan.",
    },
    {
      id: "secondary",
      title: "Repaso de materia secundaria",
      subject: second,
      minutes: allocated[3],
      focus: "Preguntas tipo examen + autoexplicación",
      priority: "P2",
      rationale: "Alterna el contexto para evitar fatiga y mantener un progreso amplio.",
    },
    {
      id: "quiz",
      title: "Quiz de control de presión",
      subject: top,
      minutes: allocated[4],
      focus: "Preguntas mixtas cronometradas",
      priority: "P2",
      rationale: "Un ensayo breve bajo presión mejora la transferencia a exámenes reales.",
    },
    {
      id: "close",
      title: "Cierra el ciclo",
      subject: second,
      minutes: allocated[5],
      focus: "3 errores para corregir mañana + 1 pregunta para clase",
      priority: "P3",
      rationale: "Termina con un siguiente paso concreto para que mañana arranques más rápido.",
    },
  ];

  const nextBestActions = [
    `Inicia el quiz de control de presión para "${top}" (basado en apuntes y clases del cuaderno).`,
    `Sprint de tarjetas (${allocated[2]} min) sobre: ${profile.weakTopics.slice(0, 2).join(", ") || "tus apuntes más recientes"}.`,
    profile.interestedInCommunity
      ? `Pregunta en la comunidad de "${top}" (${buildCommunitySubjectHref(top)}) — pide una explicación a un compañero.`
      : "Premium: practica explicación oral con el simulador de profesor.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    intensity,
    planLabel: `Plan completo · ${cap} min`,
    dailyBudgetMinutes: cap,
    overloadNote,
    preparednessScore,
    sequence,
    subjectRisks,
    nextBestActions,
  };
}
