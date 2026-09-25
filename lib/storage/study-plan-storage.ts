import { z } from "zod";

/** Old builds used one box for every account. Never read it into a user. */
const LEGACY_KEY = "kampus.studyPlan.v1";

let ownerId: string | null = null;

export function setStudyPlanOwner(userId: string | null) {
  ownerId = userId;
}

export function studyPlanStorageKey(userId: string | null = ownerId): string {
  if (!userId) return "kampus.studyPlan.v1.anonymous";
  return `kampus.studyPlan.v1.${userId}`;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

const planSubjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  topics: z.array(z.string()),
});

const planSessionSchema = z.object({
  id: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  subjectId: z.string(),
  subjectName: z.string(),
  topic: z.string(),
  minutes: z.number().int().positive(),
  done: z.boolean(),
});

const studyPlanSchema = z.object({
  subjects: z.array(planSubjectSchema),
  dailyHours: z.number().positive(),
  sessions: z.array(planSessionSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlanSubject = z.infer<typeof planSubjectSchema>;
export type PlanSession = z.infer<typeof planSessionSchema>;
export type StudyPlan = z.infer<typeof studyPlanSchema>;

function nowIso() {
  return new Date().toISOString();
}

function readJson(key: string): unknown {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadStudyPlan(userId?: string | null): StudyPlan | null {
  const json = readJson(studyPlanStorageKey(resolveOwner(userId)));
  const parsed = studyPlanSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function saveStudyPlan(plan: StudyPlan, userId?: string | null) {
  writeJson(studyPlanStorageKey(resolveOwner(userId)), plan);
}

export function createStudyPlan(
  params: {
    subjects: PlanSubject[];
    dailyHours: number;
    sessions: PlanSession[];
  },
  userId?: string | null,
): StudyPlan {
  const now = nowIso();
  const plan: StudyPlan = {
    subjects: params.subjects,
    dailyHours: params.dailyHours,
    sessions: params.sessions,
    createdAt: now,
    updatedAt: now,
  };
  saveStudyPlan(plan, userId);
  return plan;
}

export function touchStudyPlan(plan: StudyPlan, userId?: string | null): StudyPlan {
  const next: StudyPlan = { ...plan, updatedAt: nowIso() };
  saveStudyPlan(next, userId);
  return next;
}

export function clearStudyPlan(userId?: string | null) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(studyPlanStorageKey(resolveOwner(userId)));
}

export function discardLegacyStudyPlan() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_KEY);
}
