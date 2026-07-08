import type { SupabaseClient } from "@supabase/supabase-js";

import type { CommunityResourceKind } from "@/lib/community/notebook-attach";
import type { ChannelActivityStat } from "@/lib/community/activity";
import { formatAgendaCloudError } from "@/lib/notebooks/storage-errors";

export type CommunityPostRow = {
  id: string;
  channel_id: string;
  body: string;
  created_at: string;
  user_id: string;
  resource_url?: string | null;
  resource_label?: string | null;
  resource_kind?: CommunityResourceKind | null;
};

export type CommunityAnswerRow = {
  id: string;
  question_id: string;
  body: string;
  created_at: string;
  user_id: string;
};

const POST_SELECT_FULL = "id,channel_id,body,created_at,user_id,resource_url,resource_label,resource_kind";
const POST_SELECT = "id,channel_id,body,created_at,user_id,resource_url,resource_label";
const POST_SELECT_LEGACY = "id,channel_id,body,created_at,user_id";

function isMissingResourceColumn(message: string): boolean {
  return (
    message.includes("resource_url") ||
    message.includes("resource_label") ||
    message.includes("resource_kind")
  );
}

function isMissingHelpfulTable(message: string): boolean {
  return message.includes("community_post_helpful");
}

function isMissingReportsTable(message: string): boolean {
  return message.includes("community_post_reports");
}

export async function fetchChannelPosts(
  supabase: SupabaseClient,
  channelId: string,
  limit = 30,
): Promise<CommunityPostRow[]> {
  const primary = await supabase
    .from("community_posts")
    .select(POST_SELECT_FULL)
    .eq("channel_id", channelId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!primary.error) {
    return (primary.data as CommunityPostRow[]) ?? [];
  }

  if (isMissingResourceColumn(primary.error.message)) {
    const mid = await supabase
      .from("community_posts")
      .select(POST_SELECT)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!mid.error) return (mid.data as CommunityPostRow[]) ?? [];

    const legacy = await supabase
      .from("community_posts")
      .select(POST_SELECT_LEGACY)
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (legacy.error) throw new Error(formatAgendaCloudError(legacy.error.message));
    return (legacy.data as CommunityPostRow[]) ?? [];
  }

  throw new Error(formatAgendaCloudError(primary.error.message));
}

export async function fetchAnswersForPosts(
  supabase: SupabaseClient,
  postIds: string[],
): Promise<CommunityAnswerRow[]> {
  if (postIds.length === 0) return [];
  const { data, error } = await supabase
    .from("community_question_answers")
    .select("id,question_id,body,created_at,user_id")
    .in("question_id", postIds)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return (data as CommunityAnswerRow[]) ?? [];
}

export async function fetchChannelActivityBatch(
  supabase: SupabaseClient,
  channelIds: string[],
  sinceIso: string,
): Promise<Record<string, ChannelActivityStat>> {
  const result: Record<string, ChannelActivityStat> = {};
  for (const id of channelIds) {
    result[id] = { postsLast7d: 0, answersLast7d: 0 };
  }
  if (channelIds.length === 0) return result;

  const { data: posts, error } = await supabase
    .from("community_posts")
    .select("id,channel_id")
    .in("channel_id", channelIds)
    .gte("created_at", sinceIso);
  if (error) throw new Error(formatAgendaCloudError(error.message));

  const postRows = (posts ?? []) as { id: string; channel_id: string }[];
  for (const row of postRows) {
    if (result[row.channel_id]) result[row.channel_id]!.postsLast7d += 1;
  }

  const postIds = postRows.map((p) => p.id);
  if (postIds.length === 0) return result;

  const { data: answers, error: answersError } = await supabase
    .from("community_question_answers")
    .select("question_id")
    .in("question_id", postIds)
    .gte("created_at", sinceIso);
  if (answersError) throw new Error(formatAgendaCloudError(answersError.message));

  const postToChannel = Object.fromEntries(postRows.map((p) => [p.id, p.channel_id]));
  for (const row of (answers ?? []) as { question_id: string }[]) {
    const ch = postToChannel[row.question_id];
    if (ch && result[ch]) result[ch]!.answersLast7d += 1;
  }

  return result;
}

export async function fetchHelpfulCounts(
  supabase: SupabaseClient,
  postIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  if (postIds.length === 0) return counts;

  const { data, error } = await supabase
    .from("community_post_helpful")
    .select("post_id")
    .in("post_id", postIds);
  if (error) {
    if (isMissingHelpfulTable(error.message)) return counts;
    throw new Error(formatAgendaCloudError(error.message));
  }

  for (const row of (data ?? []) as { post_id: string }[]) {
    counts[row.post_id] = (counts[row.post_id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchMyHelpfulPostIds(
  supabase: SupabaseClient,
  userId: string,
  postIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;

  const { data, error } = await supabase
    .from("community_post_helpful")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) {
    if (isMissingHelpfulTable(error.message)) return set;
    throw new Error(formatAgendaCloudError(error.message));
  }

  for (const row of (data ?? []) as { post_id: string }[]) {
    set.add(row.post_id);
  }
  return set;
}

export async function togglePostHelpful(
  supabase: SupabaseClient,
  userId: string,
  postId: string,
  currentlyHelpful: boolean,
): Promise<void> {
  if (currentlyHelpful) {
    const { error } = await supabase.from("community_post_helpful").delete().eq("user_id", userId).eq("post_id", postId);
    if (error) throw new Error(formatAgendaCloudError(error.message));
  } else {
    const { error } = await supabase.from("community_post_helpful").insert({ user_id: userId, post_id: postId });
    if (error) throw new Error(formatAgendaCloudError(error.message));
  }
}

export async function insertCommunityPost(
  supabase: SupabaseClient,
  input: {
    userId: string;
    channelId: string;
    body: string;
    resourceUrl?: string;
    resourceLabel?: string;
    resourceKind?: CommunityResourceKind;
  },
): Promise<CommunityPostRow> {
  const payload: Record<string, string> = {
    user_id: input.userId,
    channel_id: input.channelId,
    body: input.body,
  };
  const url = input.resourceUrl?.trim();
  if (url) {
    payload.resource_url = url;
    const label = input.resourceLabel?.trim();
    if (label) payload.resource_label = label;
    if (input.resourceKind) payload.resource_kind = input.resourceKind;
  }

  let { data, error } = await supabase.from("community_posts").insert(payload).select(POST_SELECT_FULL).single();
  if (error && isMissingResourceColumn(error.message)) {
    const slim: Record<string, string> = {
      user_id: input.userId,
      channel_id: input.channelId,
      body: input.body,
    };
    if (url) {
      slim.resource_url = url;
      const label = input.resourceLabel?.trim();
      if (label) slim.resource_label = label;
    }
    ({ data, error } = await supabase.from("community_posts").insert(slim).select(POST_SELECT).single());
    if (error && isMissingResourceColumn(error.message)) {
      ({ data, error } = await supabase
        .from("community_posts")
        .insert({ user_id: input.userId, channel_id: input.channelId, body: input.body })
        .select(POST_SELECT_LEGACY)
        .single());
    }
  }
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return data as CommunityPostRow;
}

export async function fetchMyReportedPostIds(
  supabase: SupabaseClient,
  userId: string,
  postIds: string[],
): Promise<Set<string>> {
  const set = new Set<string>();
  if (postIds.length === 0) return set;

  const { data, error } = await supabase
    .from("community_post_reports")
    .select("post_id")
    .eq("user_id", userId)
    .in("post_id", postIds);
  if (error) {
    if (isMissingReportsTable(error.message)) return set;
    throw new Error(formatAgendaCloudError(error.message));
  }

  for (const row of (data ?? []) as { post_id: string }[]) {
    set.add(row.post_id);
  }
  return set;
}

export async function insertPostReport(
  supabase: SupabaseClient,
  input: { userId: string; postId: string; reason: string; detail?: string },
): Promise<void> {
  const { error } = await supabase.from("community_post_reports").insert({
    user_id: input.userId,
    post_id: input.postId,
    reason: input.reason,
    detail: input.detail?.trim() || null,
  });
  if (error) throw new Error(formatAgendaCloudError(error.message));
}

export async function insertCommunityAnswer(
  supabase: SupabaseClient,
  input: { userId: string; questionId: string; body: string },
): Promise<CommunityAnswerRow> {
  const { data, error } = await supabase
    .from("community_question_answers")
    .insert({ user_id: input.userId, question_id: input.questionId, body: input.body })
    .select("id,question_id,body,created_at,user_id")
    .single();
  if (error) throw new Error(formatAgendaCloudError(error.message));
  return data as CommunityAnswerRow;
}
