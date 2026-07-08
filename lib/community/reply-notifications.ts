import type { SupabaseClient } from "@supabase/supabase-js";

import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";

export type CommunityReplyNotification = {
  answerId: string;
  postId: string;
  channelId: string;
  bodyPreview: string;
  createdAt: string;
};

const SEEN_KEY = "kampus.community.repliesSeen.v1";

function seenStorageKey(userId: string): string {
  return `${SEEN_KEY}:${userId}`;
}

export function loadReplySeenAt(userId: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(seenStorageKey(userId));
  } catch {
    return null;
  }
}

export function markRepliesSeen(userId: string, at = new Date().toISOString()): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(seenStorageKey(userId), at);
  } catch {
    /* ignore */
  }
}

export async function fetchUnreadRepliesToMyPosts(
  supabase: SupabaseClient,
  userId: string,
  sinceIso: string | null,
): Promise<CommunityReplyNotification[]> {
  const since = sinceIso ?? new Date(0).toISOString();

  const { data: myPosts, error: postsError } = await supabase
    .from("community_posts")
    .select("id,channel_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (postsError) throw new Error(formatAgendaCloudError(postsError.message));

  const posts = (myPosts ?? []) as { id: string; channel_id: string }[];
  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const channelByPost = Object.fromEntries(posts.map((p) => [p.id, p.channel_id]));

  const { data: answers, error: answersError } = await supabase
    .from("community_question_answers")
    .select("id,question_id,body,created_at,user_id")
    .in("question_id", postIds)
    .gt("created_at", since)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (answersError) throw new Error(formatAgendaCloudError(answersError.message));

  return ((answers ?? []) as { id: string; question_id: string; body: string; created_at: string }[]).map(
    (a) => ({
      answerId: a.id,
      postId: a.question_id,
      channelId: channelByPost[a.question_id] ?? "",
      bodyPreview: a.body.length > 120 ? `${a.body.slice(0, 117)}…` : a.body,
      createdAt: a.created_at,
    }),
  );
}

export function buildCommunityPostHref(channelId: string, postId: string): string {
  const params = new URLSearchParams();
  params.set("channel", channelId);
  params.set("post", postId);
  return `/community?${params.toString()}`;
}
