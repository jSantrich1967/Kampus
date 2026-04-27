import type { Locale } from "@/lib/i18n/nav";
import type { UserProfile } from "@/lib/schemas/profile";

export type CommunityContext = "subject" | "exam" | "professor" | "semester" | "topic" | "university";

export type CommunityChannel = {
  id: string;
  title: string;
  subtitle: string;
  heat: "quiet" | "active" | "hot";
  membersApprox: number;
};

export type CommunityNote = {
  id: string;
  title: string;
  subject: string;
  usefulness: number; // 0-100
  examRelevance: number; // 0-100
  minutesToConsume: number;
  excerpt: string;
};

export type CommunityQuestion = {
  id: string;
  question: string;
  votes: number;
  answersApprox: number;
};

export type CommunityThread = {
  id: string;
  title: string;
  replies: number;
  trend: "up" | "flat";
};

export type CommunityAlert = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning";
};

function heatFromSeed(seed: number): CommunityChannel["heat"] {
  const m = seed % 3;
  if (m === 0) return "hot";
  if (m === 1) return "active";
  return "quiet";
}

export function buildChannels(profile: UserProfile, context: CommunityContext, locale: Locale = "es"): CommunityChannel[] {
  const es = locale === "es";
  const uni = profile.university || "Campus";
  const sem = profile.semester || "2026-1";

  if (context === "university") {
    return [
      {
        id: "u1",
        title: es ? `${uni} · boletín` : `${uni} · bulletin`,
        subtitle: es ? "Alertas de clase + cambios de sala" : "Official-ish class alerts & room swaps",
        heat: "hot",
        membersApprox: 1280,
      },
      {
        id: "u2",
        title: es ? `${uni} · feria laboral` : `${uni} · career fair`,
        subtitle: es ? "Prácticas + preparación de entrevistas" : "Internships + interview prep",
        heat: "active",
        membersApprox: 640,
      },
    ];
  }

  if (context === "semester") {
    return [
      {
        id: "sem1",
        title: es ? `${sem} supervivencia` : `${sem} survival`,
        subtitle: es ? "Fechas límite, burnout, rendición de cuentas" : "Deadlines, burnout checks, accountability",
        heat: "hot",
        membersApprox: 420,
      },
      {
        id: "sem2",
        title: es ? `${sem} electivas` : `${sem} electives`,
        subtitle: es ? "Elige clases sin arrepentirte" : "Pick classes without regret",
        heat: "active",
        membersApprox: 210,
      },
    ];
  }

  if (context === "exam") {
    if (profile.upcomingExams.length === 0) {
      return [
        {
          id: "ex-empty",
          title: es ? "Canales de examen (vacío)" : "Exam channels (empty)",
          subtitle: es
            ? "Agrega fechas de examen en ajustes para desbloquear hilos de urgencia."
            : "Add exam dates in onboarding or settings to unlock urgency threads.",
          heat: "quiet" as const,
          membersApprox: 0,
        },
      ];
    }
    return profile.upcomingExams.slice(0, 6).map((e, idx) => ({
      id: `ex-${e.subject}-${idx}`,
      title: es ? `${e.subject} · ventana de examen` : `${e.subject} · exam window`,
      subtitle: es ? `Cuenta regresiva + banco de preguntas · ${e.date}` : `Countdown + question bank · ${e.date}`,
      heat: heatFromSeed(idx + e.subject.length),
      membersApprox: 80 + (idx + 1) * 17,
    }));
  }

  if (context === "professor") {
    return profile.subjects.map((s, idx) => ({
      id: `pf-${s}`,
      title: es ? `${s} · cohorte del profe` : `${s} · professor cohort`,
      subtitle: es ? "Estilo, qué evalúa, expectativas justas" : "Style notes, what gets tested, fair expectations",
      heat: heatFromSeed(idx + 11),
      membersApprox: 120 + idx * 23,
    }));
  }

  if (context === "topic") {
    const topics = profile.weakTopics.length ? profile.weakTopics : ["Exam technique", "Notation traps", "Proof structure"];
    return topics.slice(0, 8).map((t, idx) => ({
      id: `tp-${t}`,
      title: es ? `${t} · carril de reparación` : `${t} · repair lane`,
      subtitle: es ? "Explicaciones entre pares + micro ejercicios" : "Peer explanations + micro drills",
      heat: heatFromSeed(idx + 3),
      membersApprox: 60 + idx * 9,
    }));
  }

  // subject (default rich)
  return profile.subjects.map((s, idx) => ({
    id: `sub-${s}`,
    title: es ? `${s} · sala de estudio` : `${s} · study hall`,
    subtitle: es ? "Top notas + confusiones comunes + kits" : "Top notes + common confusions + rescue packs",
    heat: heatFromSeed(idx + 7),
    membersApprox: 200 + idx * 31,
  }));
}

export function buildTopNotes(profile: UserProfile, locale: Locale = "es"): CommunityNote[] {
  const es = locale === "es";
  return profile.subjects.slice(0, 4).map((s, idx) => ({
    id: `note-${s}`,
    title: es ? `${s} one‑pager (definiciones + ejemplo canónico)` : `${s} one-pager (definitions + canonical example)`,
    subject: s,
    usefulness: 78 + (idx * 3) % 18,
    examRelevance: 70 + (idx * 5) % 22,
    minutesToConsume: 6 + idx,
    excerpt: es
      ? `Resumen de alta señal: lo que repiten los profes, lo que aparece “disfrazado”, y 3 ejercicios que arreglan ${s} rápido.`
      : `High-signal recap: what professors repeat, what shows up disguised, and the 3 drills that fix ${s} fast.`,
  }));
}

export function buildCommonQuestions(profile: UserProfile, locale: Locale = "es"): CommunityQuestion[] {
  const es = locale === "es";
  const base = profile.subjects[0] ?? "this course";
  return [
    {
      id: "q1",
      question: es
        ? `¿Cuál es la forma más rápida de ponerte al día en ${base} después de faltar a 2 clases?`
        : `What is the fastest way to catch up in ${base} after 2 missed classes?`,
      votes: 182,
      answersApprox: 26,
    },
    {
      id: "q2",
      question: es ? "¿Los profes reutilizan preguntas de examen con otros números?" : "Do professors reuse exam questions with different numbers?",
      votes: 164,
      answersApprox: 41,
    },
    {
      id: "q3",
      question: es ? "¿Cómo estudias demostraciones sin memorizar línea por línea?" : "How do you study proofs without memorizing line-by-line?",
      votes: 151,
      answersApprox: 19,
    },
  ];
}

export type PeerExplanation = {
  id: string;
  author: string;
  subject: string;
  snippet: string;
  helpfulVotes: number;
};

export function buildPeerExplanations(profile: UserProfile, locale: Locale = "es"): PeerExplanation[] {
  const es = locale === "es";
  const s1 = profile.subjects[0] ?? "General";
  const s2 = profile.subjects[1] ?? s1;
  return [
    {
      id: "pe1",
      author: es ? "Ana · 4º año" : "Ana · 4th year",
      subject: s1,
      snippet: es
        ? `Reprobé esto dos veces hasta que dejé de “releer” y empecé a reescribir el esquema desde memoria. En ${s1}, el examen repite los mismos 3 patrones — enfócate ahí.`
        : `I failed this twice until I stopped “re-reading” and started rewriting the outline from memory. For ${s1}, the exam repeats the same 3 patterns — focus there.`,
      helpfulVotes: 214,
    },
    {
      id: "pe2",
      author: es ? "Marco · energía de monitor" : "Marco · TA-ish energy",
      subject: s2,
      snippet: es
        ? `Si solo tienes 2 horas: 25m resumen → 35m preguntas mixtas → 20m tarjetas del tema más flojo. Dormir > más diapositivas.`
        : `If you only have 2 hours: 25m rescue summary → 35m mixed questions → 20m weakest topic flashcards. Sleep > extra slides.`,
      helpfulVotes: 198,
    },
    {
      id: "pe3",
      author: es ? "Notas de cohorte del profe" : "Prof. cohort notes",
      subject: s1,
      snippet: es
        ? "El profe premia supuestos explícitos. Escríbelos aunque parezcan obvios — ahí vive el crédito parcial."
        : "The instructor rewards explicit assumptions. Write them even if they feel obvious — that’s where partial credit lives.",
      helpfulVotes: 176,
    },
  ];
}

export function buildTrendingThreads(profile: UserProfile, locale: Locale = "es"): CommunityThread[] {
  const es = locale === "es";
  const s = profile.subjects[0] ?? "General";
  return [
    { id: "t1", title: es ? `${s}: hilo “explícame como si estuviera agotado/a”` : `${s}: “explain like I’m exhausted” thread`, replies: 88, trend: "up" },
    { id: "t2", title: es ? "Reglas de sueño en semana de examen que sí funcionan" : "Exam week sleep rules that actually work", replies: 54, trend: "up" },
    { id: "t3", title: es ? "Ritmo de exposición grupal — lo que castigan los jurados" : "Group presentation pacing — what juries punish", replies: 41, trend: "flat" },
  ];
}

export function buildClassAlerts(profile: UserProfile, locale: Locale = "es"): CommunityAlert[] {
  const es = locale === "es";
  const alerts: CommunityAlert[] = [
    {
      id: "a0",
      title: es ? "Recordatorio de horas tranquilas" : "Quiet hours reminder",
      body: es ? "Moderación recomienda evitar spam durante horas nocturnas." : "Community moderators recommend avoiding spam during late night blocks.",
      severity: "info",
    },
  ];
  profile.upcomingExams.slice(0, 2).forEach((e, idx) => {
    alerts.push({
      id: `a-${idx}`,
      title: es ? `${e.subject}: examen cerca` : `${e.subject}: exam proximity`,
      body: es ? `Se abrió un canal de sprint de estudio para fechas alrededor de ${e.date}.` : `A study sprint channel was opened for dates around ${e.date}.`,
      severity: "warning",
    });
  });
  return alerts;
}

export const ALL_COMMUNITY_CONTEXTS: CommunityContext[] = [
  "subject",
  "exam",
  "professor",
  "semester",
  "topic",
  "university",
];

/** Resolve which context tab owns a channel id (for deep links). */
export function resolveChannelNavigation(
  profile: UserProfile,
  channelId: string,
): { context: CommunityContext } | null {
  for (const ctx of ALL_COMMUNITY_CONTEXTS) {
    if (buildChannels(profile, ctx).some((c) => c.id === channelId)) {
      return { context: ctx };
    }
  }
  return null;
}
