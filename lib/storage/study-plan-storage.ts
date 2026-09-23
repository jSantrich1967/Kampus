import { z } from "zod";

const PLAN_KEY = "kampus.studyPlan.v1";

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

export function loadStudyPlan(): StudyPlan | null {
  const json = readJson(PLAN_KEY);
  const parsed = studyPlanSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

export function saveStudyPlan(plan: StudyPlan) {
  writeJson(PLAN_KEY, plan);
}

export function createStudyPlan(params: {
  subjects: PlanSubject[];
  dailyHours: number;
  sessions: PlanSession[];
}): StudyPlan {
  const now = nowIso();
  const plan: StudyPlan = {
    subjects: params.subjects,
    dailyHours: params.dailyHours,
    sessions: params.sessions,
    createdAt: now,
    updatedAt: now,
  };
  saveStudyPlan(plan);
  return plan;
}

export function touchStudyPlan(plan: StudyPlan): StudyPlan {
  const next: StudyPlan = { ...plan, updatedAt: nowIso() };
  saveStudyPlan(next);
  return next;
}

export function clearStudyPlan() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PLAN_KEY);
}
