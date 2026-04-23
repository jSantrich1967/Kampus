import type { UserProfile } from "@/lib/schemas/profile";

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
  dailyBudgetMinutes: number;
  overloadNote: string | null;
  preparednessScore: number; // 0-100
  sequence: StudyBlock[];
  subjectRisks: SubjectRisk[];
  nextBestActions: string[];
};

function daysUntil(isoDate: string): number | null {
  const target = new Date(isoDate);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function riskForSubject(
  subject: string,
  profile: UserProfile,
): { risk: RiskLevel; score: number; reasons: string[]; nextAction: string } {
  const exams = profile.upcomingExams.filter((e) => e.subject === subject);
  let score = 35;
  const reasons: string[] = [];

  const nearest = exams
    .map((e) => daysUntil(e.date))
    .filter((d): d is number => d !== null)
    .sort((a, b) => a - b)[0];

  if (nearest !== undefined) {
    if (nearest <= 3) {
      score += 45;
      reasons.push("La ventana de examen está muy cerca.");
    } else if (nearest <= 10) {
      score += 28;
      reasons.push("El examen próximo aumenta la presión.");
    } else if (nearest <= 21) {
      score += 12;
      reasons.push("El examen ya aparece en el horizonte.");
    }
  } else {
    reasons.push("No hay fecha de examen registrada — asumimos mantenimiento constante.");
  }

  if (profile.weakTopics.length > 0) {
    score += Math.min(18, profile.weakTopics.length * 4);
    reasons.push("Marcaste temas débiles — la recuperación espaciada te ayudará.");
  }
  const weakLinked = profile.weakTopics.some(
    (t) =>
      subject.toLowerCase().includes(t.toLowerCase()) ||
      t.toLowerCase().includes(subject.toLowerCase()),
  );
  if (weakLinked) {
    score += 10;
    reasons.push("Los temas débiles conectan con esta materia — prioriza repeticiones de reparación.");
  }

  if (profile.missedClassesApprox >= 4) {
    score += 10;
    reasons.push("Las clases perdidas se acumulan — los rescates cierran la brecha.");
  }

  let risk: RiskLevel = "low";
  if (score >= 70) risk = "high";
  else if (score >= 45) risk = "medium";

  const nextAction =
    risk === "high"
      ? "Ejecuta Rescate de clase con el material más reciente y luego practica 20 tarjetas."
      : risk === "medium"
        ? "Haz 25 minutos de repaso enfocado + 10 preguntas de recuerdo rápido."
        : "Mantén con un repaso ligero y un quiz para sostener la confianza.";

  return { risk, score: Math.min(100, Math.round(score)), reasons, nextAction };
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
export function buildPassModePlan(profile: UserProfile): PassModePlan {
  const subjectRisks = buildSubjectRisks(profile).sort((a, b) => b.score - a.score);

  const dailyBudgetMinutes = Math.round((profile.weeklyAvailabilityHours * 60) / 7);
  const cap = Math.max(45, Math.min(180, dailyBudgetMinutes));

  const overloadNote =
    profile.weeklyAvailabilityHours * 60 < profile.subjects.length * 90
      ? "Tu carga de materias supera tus minutos disponibles: acortamos sesiones y priorizamos exámenes."
      : null;

  const top = subjectRisks[0]?.subject ?? profile.subjects[0] ?? "General";
  const second = subjectRisks[1]?.subject ?? profile.subjects[1] ?? top;

  const weights = [0.16, 0.34, 0.24, 0.14, 0.12] as const;
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
      id: "secondary",
      title: "Repaso de materia secundaria",
      subject: second,
      minutes: allocated[2],
      focus: "Preguntas tipo examen + autoexplicación",
      priority: "P2",
      rationale: "Alterna el contexto para evitar fatiga y mantener un progreso amplio.",
    },
    {
      id: "quiz",
      title: "Quiz de control de presión",
      subject: top,
      minutes: allocated[3],
      focus: "Preguntas mixtas cronometradas",
      priority: "P2",
      rationale: "Un ensayo breve bajo presión mejora la transferencia a exámenes reales.",
    },
    {
      id: "close",
      title: "Cierra el ciclo",
      subject: second,
      minutes: allocated[4],
      focus: "3 errores para corregir mañana + 1 pregunta para clase",
      priority: "P3",
      rationale: "Termina con un siguiente paso concreto para que mañana arranques más rápido.",
    },
  ];

  const avgRisk =
    subjectRisks.reduce((acc, s) => acc + s.score, 0) / Math.max(1, subjectRisks.length);
  const preparednessScore = Math.max(12, Math.min(92, Math.round(88 - avgRisk * 0.35)));

  const nextBestActions = [
    `Abre Rescate de clase para "${top}" y genera preguntas probables de examen.`,
    `Haz un sprint de tarjetas de 12 minutos sobre: ${profile.weakTopics.slice(0, 2).join(", ") || "tus apuntes más recientes"}.`,
    profile.interestedInCommunity
      ? "Únete a un hilo de la comunidad de la materia pidiendo una explicación de un compañero/a."
      : "Comparte un resumen de 3 viñetas con un compañero/a: enseñar fija la memoria.",
  ];

  return {
    generatedAt: new Date().toISOString(),
    dailyBudgetMinutes: cap,
    overloadNote,
    preparednessScore,
    sequence,
    subjectRisks,
    nextBestActions,
  };
}
