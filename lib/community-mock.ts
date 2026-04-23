import type { UserProfile } from "@/lib/schemas/profile";

export type CommunityContext = "subject" | "exam" | "professor" | "semester" | "topic" | "university";

export type CommunityChannel = {
  id: string;
  title: string;
  subtitle: string;
  heat: "quiet" | "active" | "hot";
  membersApprox: number;
};

export type CommunityNote = {
  id: string;
  title: string;
  subject: string;
  usefulness: number; // 0-100
  examRelevance: number; // 0-100
  minutesToConsume: number;
  excerpt: string;
};

export type CommunityQuestion = {
  id: string;
  question: string;
  votes: number;
  answersApprox: number;
};

export type CommunityThread = {
  id: string;
  title: string;
  replies: number;
  trend: "up" | "flat";
};

export type CommunityAlert = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning";
};

function heatFromSeed(seed: number): CommunityChannel["heat"] {
  const m = seed % 3;
  if (m === 0) return "hot";
  if (m === 1) return "active";
  return "quiet";
}

export function buildChannels(profile: UserProfile, context: CommunityContext): CommunityChannel[] {
  const uni = profile.university || "Campus";
  const sem = profile.semester || "2026-1";

  if (context === "university") {
    return [
      { id: "u1", title: `${uni} · bulletin`, subtitle: "Official-ish class alerts & room swaps", heat: "hot", membersApprox: 1280 },
      { id: "u2", title: `${uni} · career fair`, subtitle: "Internships + interview prep", heat: "active", membersApprox: 640 },
    ];
  }

  if (context === "semester") {
    return [
      { id: "sem1", title: `${sem} survival`, subtitle: "Deadlines, burnout checks, accountability", heat: "hot", membersApprox: 420 },
      { id: "sem2", title: `${sem} electives`, subtitle: "Pick classes without regret", heat: "active", membersApprox: 210 },
    ];
  }

  if (context === "exam") {
    if (profile.upcomingExams.length === 0) {
      return [
        {
          id: "ex-empty",
          title: "Exam channels (empty)",
          subtitle: "Add exam dates in onboarding or settings to unlock urgency threads.",
          heat: "quiet" as const,
          membersApprox: 0,
        },
      ];
    }
    return profile.upcomingExams.slice(0, 6).map((e, idx) => ({
      id: `ex-${e.subject}-${idx}`,
      title: `${e.subject} · exam window`,
      subtitle: `Countdown + question bank · ${e.date}`,
      heat: heatFromSeed(idx + e.subject.length),
      membersApprox: 80 + (idx + 1) * 17,
    }));
  }

  if (context === "professor") {
    return profile.subjects.map((s, idx) => ({
      id: `pf-${s}`,
      title: `${s} · professor cohort`,
      subtitle: "Style notes, what gets tested, fair expectations",
      heat: heatFromSeed(idx + 11),
      membersApprox: 120 + idx * 23,
    }));
  }

  if (context === "topic") {
    const topics = profile.weakTopics.length ? profile.weakTopics : ["Exam technique", "Notation traps", "Proof structure"];
    return topics.slice(0, 8).map((t, idx) => ({
      id: `tp-${t}`,
      title: `${t} · repair lane`,
      subtitle: "Peer explanations + micro drills",
      heat: heatFromSeed(idx + 3),
      membersApprox: 60 + idx * 9,
    }));
  }

  // subject (default rich)
  return profile.subjects.map((s, idx) => ({
    id: `sub-${s}`,
    title: `${s} · study hall`,
    subtitle: "Top notes + common confusions + rescue packs",
    heat: heatFromSeed(idx + 7),
    membersApprox: 200 + idx * 31,
  }));
}

export function buildTopNotes(profile: UserProfile): CommunityNote[] {
  return profile.subjects.slice(0, 4).map((s, idx) => ({
    id: `note-${s}`,
    title: `${s} one-pager (definitions + canonical example)`,
    subject: s,
    usefulness: 78 + (idx * 3) % 18,
    examRelevance: 70 + (idx * 5) % 22,
    minutesToConsume: 6 + idx,
    excerpt: `High-signal recap: what professors repeat, what shows up disguised, and the 3 drills that fix ${s} fast.`,
  }));
}

export function buildCommonQuestions(profile: UserProfile): CommunityQuestion[] {
  const base = profile.subjects[0] ?? "this course";
  return [
    { id: "q1", question: `What is the fastest way to catch up in ${base} after 2 missed classes?`, votes: 182, answersApprox: 26 },
    { id: "q2", question: "Do professors reuse exam questions with different numbers?", votes: 164, answersApprox: 41 },
    { id: "q3", question: "How do you study proofs without memorizing line-by-line?", votes: 151, answersApprox: 19 },
  ];
}

export type PeerExplanation = {
  id: string;
  author: string;
  subject: string;
  snippet: string;
  helpfulVotes: number;
};

export function buildPeerExplanations(profile: UserProfile): PeerExplanation[] {
  const s1 = profile.subjects[0] ?? "General";
  const s2 = profile.subjects[1] ?? s1;
  return [
    {
      id: "pe1",
      author: "Ana · 4th year",
      subject: s1,
      snippet: `I failed this twice until I stopped “re-reading” and started rewriting the outline from memory. For ${s1}, the exam repeats the same 3 patterns — focus there.`,
      helpfulVotes: 214,
    },
    {
      id: "pe2",
      author: "Marco · TA-ish energy",
      subject: s2,
      snippet: `If you only have 2 hours: 25m rescue summary → 35m mixed questions → 20m weakest topic flashcards. Sleep > extra slides.`,
      helpfulVotes: 198,
    },
    {
      id: "pe3",
      author: "Prof. cohort notes",
      subject: s1,
      snippet: "The instructor rewards explicit assumptions. Write them even if they feel obvious — that’s where partial credit lives.",
      helpfulVotes: 176,
    },
  ];
}

export function buildTrendingThreads(profile: UserProfile): CommunityThread[] {
  const s = profile.subjects[0] ?? "General";
  return [
    { id: "t1", title: `${s}: “explain like I’m exhausted” thread`, replies: 88, trend: "up" },
    { id: "t2", title: "Exam week sleep rules that actually work", replies: 54, trend: "up" },
    { id: "t3", title: "Group presentation pacing — what juries punish", replies: 41, trend: "flat" },
  ];
}

export function buildClassAlerts(profile: UserProfile): CommunityAlert[] {
  const alerts: CommunityAlert[] = [
    {
      id: "a0",
      title: "Quiet hours reminder",
      body: "Community moderators recommend avoiding spam during late night blocks.",
      severity: "info",
    },
  ];
  profile.upcomingExams.slice(0, 2).forEach((e, idx) => {
    alerts.push({
      id: `a-${idx}`,
      title: `${e.subject}: exam proximity`,
      body: `A study sprint channel was opened for dates around ${e.date}.`,
      severity: "warning",
    });
  });
  return alerts;
}

export const ALL_COMMUNITY_CONTEXTS: CommunityContext[] = [
  "subject",
  "exam",
  "professor",
  "semester",
  "topic",
  "university",
];

/** Resolve which context tab owns a channel id (for deep links). */
export function resolveChannelNavigation(
  profile: UserProfile,
  channelId: string,
): { context: CommunityContext } | null {
  for (const ctx of ALL_COMMUNITY_CONTEXTS) {
    if (buildChannels(profile, ctx).some((c) => c.id === channelId)) {
      return { context: ctx };
    }
  }
  return null;
}
