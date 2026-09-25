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

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.presentation.v1";
const LEGACY_ACTIVE_DECK_KEY = "kampus.presentation.activeDeckId.v1";

let accountId: string | null = null;

export function setPresentationStorageOwner(userId: string | null) {
  accountId = userId;
}

export function presentationStorageKey(userId: string | null = accountId): string {
  if (!userId) return "kampus.presentation.v1.anonymous";
  return `kampus.presentation.v1.${userId}`;
}

export function activePresentationDeckStorageKey(userId: string | null = accountId): string {
  if (!userId) return "kampus.presentation.activeDeckId.v1.anonymous";
  return `kampus.presentation.activeDeckId.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? accountId : userId;
}

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

/** Lienzo vacío para una exposición nueva (primera visita o botón “Nueva exposición”). */
export function createBlankPresentationState(): PresentationState {
  const ownerId = "m1";
  return {
    deckTitle: "",
    teamSessionCode: "",
    presentationDueDate: undefined,
    members: [{ id: ownerId, name: "Yo", role: "" }],
    sections: [{ id: "s1", title: "Introducción", ownerId, minutes: 5, script: "" }],
    masterScript: "",
    probableQuestions: [],
    juryNotes: "",
    teleprompterFontPx: 28,
    teleprompterLineHeight: 1.35,
  };
}

/** Plantilla precargada con equipo, secciones y textos de ejemplo (para aprender la herramienta). */
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

export function loadPresentation(userId?: string | null): PresentationState {
  /** Evita códigos aleatorios en SSR (hydration). */
  if (typeof window === "undefined") {
    return { ...createBlankPresentationState(), teamSessionCode: "" };
  }
  try {
    const raw = window.localStorage.getItem(presentationStorageKey(resolveOwner(userId)));
    if (!raw) return ensurePresentationTeamCode(createBlankPresentationState());
    const parsed = JSON.parse(raw) as PresentationState;
    if (!parsed || typeof parsed !== "object") return ensurePresentationTeamCode(createBlankPresentationState());
    return ensurePresentationTeamCode({ ...createBlankPresentationState(), ...parsed });
  } catch {
    return ensurePresentationTeamCode(createBlankPresentationState());
  }
}

export function savePresentation(state: PresentationState, userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(presentationStorageKey(resolveOwner(userId)), JSON.stringify(state));
}

export function loadActivePresentationDeckId(userId?: string | null): string | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(activePresentationDeckStorageKey(resolveOwner(userId)))?.trim();
  return v || null;
}

export function saveActivePresentationDeckId(id: string | null, userId?: string | null) {
  if (typeof window === "undefined") return;
  const key = activePresentationDeckStorageKey(resolveOwner(userId));
  if (!id) window.localStorage.removeItem(key);
  else window.localStorage.setItem(key, id);
}

export function clearPresentationStorage(userId: string | null = accountId) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(presentationStorageKey(userId));
  window.localStorage.removeItem(activePresentationDeckStorageKey(userId));
}

export function discardLegacyPresentationStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
  window.localStorage.removeItem(LEGACY_ACTIVE_DECK_KEY);
}

/** Merge JSONB from Supabase into a full PresentationState (migraciones / filas vacías). */
export function presentationStateFromRemoteJson(raw: unknown): PresentationState {
  const blank = createBlankPresentationState();
  if (!raw || typeof raw !== "object") {
    return ensurePresentationTeamCode({ ...blank, teamSessionCode: "" });
  }
  const patch = raw as Partial<PresentationState>;
  const merged: PresentationState = {
    ...blank,
    ...patch,
    members: Array.isArray(patch.members) && patch.members.length > 0 ? patch.members : blank.members,
    sections: Array.isArray(patch.sections) && patch.sections.length > 0 ? patch.sections : blank.sections,
    probableQuestions: Array.isArray(patch.probableQuestions) ? patch.probableQuestions : blank.probableQuestions,
  };
  return ensurePresentationTeamCode(merged);
}
