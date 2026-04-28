const STORAGE_KEY = "kampus.presentation.v1";

export type PresentationMember = { id: string; name: string; role: string };
export type PresentationSection = {
  id: string;
  title: string;
  ownerId: string;
  minutes: number;
  script: string;
};

export type PresentationState = {
  deckTitle: string;
  /** Código corto compartido (convocatoria) para que el equipo confluya en la misma “sala” lógica. */
  teamSessionCode: string;
  /** YYYY-MM-DD — aparece en Mi calendario académico como exposición. */
  presentationDueDate?: string;
  members: PresentationMember[];
  sections: PresentationSection[];
  masterScript: string;
  probableQuestions: string[];
  juryNotes: string;
  teleprompterFontPx: number;
  teleprompterLineHeight: number;
};

export function generateTeamSessionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[Math.floor(Math.random() * chars.length)]!;
  return out;
}

function normalizeTeamSessionCode(raw: string | undefined): string {
  const cleaned = (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length >= 6) return cleaned.slice(0, 8);
  return generateTeamSessionCode();
}

export function ensurePresentationTeamCode(state: PresentationState): PresentationState {
  return { ...state, teamSessionCode: normalizeTeamSessionCode(state.teamSessionCode) };
}

export const defaultPresentationState: PresentationState = {
  deckTitle: "Mi exposición",
  teamSessionCode: "",
  members: [
    { id: "m1", name: "Yo", role: "Líder + apertura" },
    { id: "m2", name: "Compañero A", role: "Métodos" },
    { id: "m3", name: "Compañero B", role: "Resultados + preguntas" },
  ],
  sections: [
    { id: "s1", title: "Inicio + problema", ownerId: "m1", minutes: 2, script: "Por qué esto importa, en una frase…" },
    { id: "s2", title: "Enfoque", ownerId: "m2", minutes: 3, script: "Cómo lo abordamos…" },
    { id: "s3", title: "Resultados", ownerId: "m3", minutes: 4, script: "Qué aprendimos…" },
  ],
  masterScript: "Guión completo de corrida. Mantén transiciones claras.",
  probableQuestions: [
    "¿Cuál es la principal limitación de su enfoque?",
    "¿Cómo escalaría esto con el doble de datos?",
    "¿Por qué deberíamos confiar en la métrica clave?",
  ],
  juryNotes: "Jurado simulado: cuiden el ritmo en la diapositiva 4; bajen jerga en la sección 2.",
  teleprompterFontPx: 28,
  teleprompterLineHeight: 1.35,
};

export function loadPresentation(): PresentationState {
  /** Evita códigos aleatorios en SSR (hydration). */
  if (typeof window === "undefined") {
    return { ...defaultPresentationState, teamSessionCode: "" };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return ensurePresentationTeamCode(defaultPresentationState);
    const parsed = JSON.parse(raw) as PresentationState;
    if (!parsed || typeof parsed !== "object") return ensurePresentationTeamCode(defaultPresentationState);
    return ensurePresentationTeamCode({ ...defaultPresentationState, ...parsed });
  } catch {
    return ensurePresentationTeamCode(defaultPresentationState);
  }
}

export function savePresentation(state: PresentationState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
