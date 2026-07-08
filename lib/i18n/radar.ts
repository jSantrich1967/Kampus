import type { Locale } from "@/lib/i18n/nav";

export const radarCopy: Record<
  Locale,
  {
    eyebrow: string;
    title: string;
    description: string;
    shareLabel: string;
    shareCopied: string;
    dataLoading: string;
    researchSignal: (count: number) => string;
    onboardingTitle: string;
    onboardingHint: string;
    featureExams: string;
    featureResearch: string;
    featureWeakTopics: string;
    featureWellbeing: string;
    featurePassMode: string;
    featureHeuristic: string;
    steps: string;
    localOnlyHint: string;
    demoCta: string;
    demoFootnote: string;
    demoOk: string;
    demoExistsOk: string;
    demoError: string;
    researchCta: string;
    examsCta: string;
    passModeCta: string;
    emptySubjects: string;
  }
> = {
  es: {
    eyebrow: "Radar académico",
    title: "Dónde duele, y qué hacer hoy.",
    description:
      "Señal heurística con exámenes de tu agenda, entregas de Mis investigaciones, temas débiles y — si escribes en el diario — bienestar.",
    shareLabel: "Compartir radar",
    shareCopied: "Copiado",
    dataLoading: "Actualizando señales…",
    researchSignal: (count) =>
      count === 1
        ? "1 entrega pendiente de Mis investigaciones influye en el radar."
        : `${count} entregas pendientes de Mis investigaciones influyen en el radar.`,
    onboardingTitle: "Cómo leer tu radar",
    onboardingHint:
      "No es una nota oficial: combina fechas, entregas y hábitos para sugerirte dónde enfocarte esta semana.",
    featureExams: "Exámenes (Mi calendario / agenda)",
    featureResearch: "Entregas (Mis investigaciones)",
    featureWeakTopics: "Temas débiles del perfil",
    featureWellbeing: "Puente con diario (Bienestar)",
    featurePassMode: "Enlace a Modo aprobar",
    featureHeuristic: "Modelo explicable (no caja negra)",
    steps:
      "1) Carga señales demo o registra exámenes/entregas · 2) Revisa la materia en rojo/ámbar · 3) Sigue la acción sugerida · 4) Usa Modo aprobar o Mis investigaciones.",
    localOnlyHint: "Sin Supabase usamos datos demo locales. Inicia sesión para sincronizar exámenes y entregas reales.",
    demoCta: "Cargar señales demo",
    demoFootnote: "Añade exámenes demo (si no tienes) y entregas demo para ver el radar con datos.",
    demoOk: "Señales demo listas — el radar se actualizó.",
    demoExistsOk: "Ya tenías datos demo — perfil y entregas sincronizados.",
    demoError: "No se pudieron cargar las señales demo.",
    researchCta: "Mis investigaciones",
    examsCta: "Mis exámenes",
    passModeCta: "Modo aprobar",
    emptySubjects: "Añade materias en Ajustes u onboarding para ver tarjetas por asignatura.",
  },
};
