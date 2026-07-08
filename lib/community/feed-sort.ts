import type { CommunityAnswerRow, CommunityPostRow } from "@/lib/supabase/community-db";

export type CommunityFeedSort = "recent" | "trending";

export function sortCommunityPosts(
  posts: CommunityPostRow[],
  answersByQuestion: Record<string, CommunityAnswerRow[]>,
  sort: CommunityFeedSort,
): CommunityPostRow[] {
  const copy = [...posts];
  if (sort === "recent") {
    return copy.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return copy.sort((a, b) => {
    const scoreA = trendingScore(a, answersByQuestion[a.id] ?? [], weekAgo);
    const scoreB = trendingScore(b, answersByQuestion[b.id] ?? [], weekAgo);
    if (scoreB !== scoreA) return scoreB - scoreA;
    return b.created_at.localeCompare(a.created_at);
  });
}

function trendingScore(post: CommunityPostRow, answers: CommunityAnswerRow[], weekAgoMs: number): number {
  const recentAnswers = answers.filter((a) => new Date(a.created_at).getTime() >= weekAgoMs).length;
  const postRecent = new Date(post.created_at).getTime() >= weekAgoMs ? 1 : 0;
  return recentAnswers * 2 + answers.length + postRecent;
}
