export type DuelQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
};

export type DuelStatus = "waiting" | "done";

export type DuelRow = {
  id: string;
  code: string;
  subject: string;
  topic: string;
  questions: DuelQuestion[];
  creator_id: string;
  creator_name: string;
  creator_score: number | null;
  creator_time_ms: number | null;
  challenger_id: string | null;
  challenger_name: string | null;
  challenger_score: number | null;
  challenger_time_ms: number | null;
  status: DuelStatus;
  created_at: string;
};

export const DUEL_QUESTION_COUNT = 8;
export const DUEL_SECONDS_PER_QUESTION = 20;

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateDuelCode(): string {
  let code = "";
  const bytes = new Uint32Array(6);
  crypto.getRandomValues(bytes);
  for (const b of bytes) code += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return code;
}

export function normalizeDuelCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

export type DuelOutcome = {
  winner: "creator" | "challenger" | "tie" | null;
  creatorScore: number;
  challengerScore: number | null;
};

export function decideDuelWinner(duel: DuelRow): DuelOutcome {
  const creatorScore = duel.creator_score ?? 0;
  const challengerScore = duel.challenger_score;
  if (challengerScore === null || challengerScore === undefined) {
    return { winner: null, creatorScore, challengerScore: null };
  }
  if (creatorScore > challengerScore) return { winner: "creator", creatorScore, challengerScore };
  if (challengerScore > creatorScore) return { winner: "challenger", creatorScore, challengerScore };
  const creatorTime = duel.creator_time_ms ?? Number.MAX_SAFE_INTEGER;
  const challengerTime = duel.challenger_time_ms ?? Number.MAX_SAFE_INTEGER;
  if (creatorTime < challengerTime) return { winner: "creator", creatorScore, challengerScore };
  if (challengerTime < creatorTime) return { winner: "challenger", creatorScore, challengerScore };
  return { winner: "tie", creatorScore, challengerScore };
}

export function buildDuelShareText(code: string, subject: string): string {
  return `⚔️ ¡Te reto a un duelo en Kampus! Materia: ${subject}. Mi código: ${code}. Entra a Kampus → Duelos → "Unirse con código" y demuestra quién sabe más.`;
}

export function buildDuelShareUrl(code: string, subject: string): string {
  return `https://wa.me/?text=${encodeURIComponent(buildDuelShareText(code, subject))}`;
}
