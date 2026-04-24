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

export const defaultPresentationState: PresentationState = {
  deckTitle: "Team presentation",
  members: [
    { id: "m1", name: "You", role: "Lead + opener" },
    { id: "m2", name: "Teammate A", role: "Methods" },
    { id: "m3", name: "Teammate B", role: "Results + Q&A" },
  ],
  sections: [
    { id: "s1", title: "Hook + problem", ownerId: "m1", minutes: 2, script: "Why this matters in one sentence…" },
    { id: "s2", title: "Approach", ownerId: "m2", minutes: 3, script: "How we tackled it…" },
    { id: "s3", title: "Results", ownerId: "m3", minutes: 4, script: "What we learned…" },
  ],
  masterScript: "Full run-through script. Keep transitions explicit.",
  probableQuestions: [
    "What is the main limitation of your approach?",
    "How would this scale with twice the data?",
    "Why should we believe the key metric?",
  ],
  juryNotes: "Mock jury: watch pacing on slide 4; tighten jargon in section 2.",
  teleprompterFontPx: 28,
  teleprompterLineHeight: 1.35,
};

export function loadPresentation(): PresentationState {
  if (typeof window === "undefined") return defaultPresentationState;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPresentationState;
    const parsed = JSON.parse(raw) as PresentationState;
    if (!parsed || typeof parsed !== "object") return defaultPresentationState;
    return { ...defaultPresentationState, ...parsed };
  } catch {
    return defaultPresentationState;
  }
}

export function savePresentation(state: PresentationState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
