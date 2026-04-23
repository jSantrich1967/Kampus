import type { UserProfile } from "@/lib/schemas/profile";

export type CourseSignalRow = {
  courseCode: string;
  courseName: string;
  students: number;
  atRiskPct: number;
  avgScore: number;
  engagementIndex: number; // 0-100
  hardestTopic: string;
  intervention: string;
};

export type InstitutionKpis = {
  activeStudents: number;
  coursesMonitored: number;
  atRiskStudents: number;
  avgEngagement: number;
  gradingConsistency: number; // 0-100
  retentionRisk: "low" | "medium" | "high";
};

export function buildInstitutionKpis(profile: UserProfile): InstitutionKpis {
  const n = Math.max(3, profile.subjects.length * 140 + 820);
  return {
    activeStudents: n,
    coursesMonitored: Math.max(4, profile.subjects.length + 6),
    atRiskStudents: Math.round(n * 0.11),
    avgEngagement: 72 + (profile.subjects.length % 5),
    gradingConsistency: 81,
    retentionRisk: profile.subjects.length > 5 ? "medium" : "low",
  };
}

export function buildCourseSignals(profile: UserProfile): CourseSignalRow[] {
  if (profile.subjects.length === 0) {
    return [
      {
        courseCode: "CRS-000",
        courseName: "Institution-wide baseline",
        students: 1240,
        atRiskPct: 12,
        avgScore: 73,
        engagementIndex: 66,
        hardestTopic: "Onboarding coverage",
        intervention: "Collect subject enrollment mapping to unlock course-level signals",
      },
    ];
  }
  return profile.subjects.map((s, idx) => ({
    courseCode: `CRS-${100 + idx}`,
    courseName: s,
    students: 180 + idx * 22,
    atRiskPct: 9 + (idx * 3) % 12,
    avgScore: 74 - (idx % 4),
    engagementIndex: 68 + (idx * 5) % 24,
    hardestTopic: profile.weakTopics[idx % Math.max(1, profile.weakTopics.length)] ?? "Proof-heavy unit",
    intervention: idx % 2 === 0 ? "Offer targeted remediation workshop" : "Publish micro-quiz + instructor FAQ",
  }));
}

export type EngagementSeriesPoint = { label: string; value: number };

export function buildEngagementSeries(): EngagementSeriesPoint[] {
  return [
    { label: "W-4", value: 58 },
    { label: "W-3", value: 62 },
    { label: "W-2", value: 66 },
    { label: "W-1", value: 71 },
    { label: "Now", value: 69 },
  ];
}

export type DifficultTopicAggregate = { topic: string; mentions: number; courses: number };

export function buildDifficultTopics(profile: UserProfile): DifficultTopicAggregate[] {
  const topics = profile.weakTopics.length ? profile.weakTopics : ["Integrals", "Proof writing", "Time management"];
  return topics.slice(0, 5).map((t, idx) => ({
    topic: t,
    mentions: 40 + idx * 12,
    courses: 2 + (idx % 3),
  }));
}
