import { z } from "zod";

export const roleSchema = z.enum(["student", "teacher", "institution", "learner"]);

export const examInputSchema = z.object({
  subject: z.string().min(1),
  date: z.string().min(1), // ISO date string
});

export const profileSchema = z.object({
  onboardingFinished: z.boolean(),
  plan: z.enum(["free", "premium"]).default("free"),
  role: roleSchema,
  university: z.string().default(""),
  major: z.string().min(1),
  semester: z.string().min(1),
  subjects: z.array(z.string().min(1)).min(1),
  upcomingExams: z.array(examInputSchema).default([]),
  weakTopics: z.array(z.string()).default([]),
  missedClassesApprox: z.coerce.number().int().min(0).max(80).default(0),
  weeklyAvailabilityHours: z.coerce.number().min(1).max(80).default(10),
  preferredLanguage: z.literal("es"),
  interestedInCommunity: z.boolean(),
  learningGoals: z.string().min(1),
  streakDays: z.coerce.number().int().min(0).default(0),
  lastActiveDate: z.string().optional(),
});

export type UserProfile = z.infer<typeof profileSchema>;
export type UserRole = z.infer<typeof roleSchema>;

export const defaultProfile: UserProfile = {
  onboardingFinished: false,
  plan: "free",
  role: "student",
  university: "",
  major: "",
  semester: "",
  subjects: [],
  upcomingExams: [],
  weakTopics: [],
  missedClassesApprox: 0,
  weeklyAvailabilityHours: 12,
  preferredLanguage: "es",
  interestedInCommunity: true,
  learningGoals: "",
  streakDays: 0,
};
