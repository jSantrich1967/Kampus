import type { Locale } from "@/lib/i18n/nav";

export const flashcardsCopy: Record<
  Locale,
  {
    onboardingTitle: string;
    onboardingHint: string;
    featureAdaptive: string;
    featureWeakTopics: string;
    featurePassMode: string;
    featureTimer: string;
    featureStreak: string;
    featureRescue: string;
    steps: string;
    planCta: string;
    demoCta: string;
    demoFootnote: string;
    previewTitle: string;
    previewHint: string;
    previewEmpty: string;
    previewMore: (n: number) => string;
    radarCta: string;
    passModeCta: string;
    rescueCta: string;
    cardCount: (n: number) => string;
    focusLabel: (focus: string) => string;
  }
> = {
  es: {
    onboardingTitle: "Cómo usar Tarjetas",
    onboardingHint:
      "Repaso activo en sprints cortos. El mazo se genera desde tus temas débiles, el Modo aprobar y el radar académico.",
    featureAdaptive: "Mazo adaptativo según tu perfil",
    featureWeakTopics: "Prioriza temas débiles del onboarding",
    featurePassMode: "Integrado con la secuencia del Modo aprobar",
    featureTimer: "Sprint con temporizador (3–20 min)",
    featureStreak: "Cuenta para racha y misión de hoy",
    featureRescue: "También desde kit del cuaderno (Rescate)",
    steps:
      "1) Revisa la vista previa del mazo · 2) Inicia el sprint · 3) Voltea cada tarjeta · 4) Marca «Lo sabía» o «Repasar luego» · 5) Al terminar, sigue el siguiente bloque del plan.",
    planCta: "Iniciar repaso del plan",
    demoCta: "Iniciar repaso demo",
    demoFootnote:
      "El demo usa un mazo fijo de ejemplo. Tu mazo real se genera con tus asignaturas y temas débiles.",
    previewTitle: "Vista previa del mazo",
    previewHint: "Primeras tarjetas que verás en la sesión según tu plan actual.",
    previewEmpty: "Completa el onboarding o añade asignaturas para generar tarjetas.",
    previewMore: (n) => `+${n} tarjetas más en la sesión completa`,
    radarCta: "Ver radar académico",
    passModeCta: "Abrir Modo aprobar",
    rescueCta: "Kit del cuaderno",
    cardCount: (n) => `${n} tarjetas en el mazo`,
    focusLabel: (focus) => (focus ? `Enfoque: ${focus}` : "Repaso activo del cuaderno"),
  },
};
