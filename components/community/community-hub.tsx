"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CommunityChannelFeed } from "@/components/community/community-channel-feed";
import { CommunityChannelPicker } from "@/components/community/community-channel-picker";
import { CommunityReplyBannerFromNotifications } from "@/components/community/community-reply-banner";
import { ShareLinkButton } from "@/components/growth/share-link-button";
import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatBlock } from "@/components/ui/stat-block";
import { useCommunityReplyNotifications } from "@/hooks/use-community-reply-notifications";
import type { CommunityContext } from "@/lib/community-types";
import { weekAgoIso } from "@/lib/community/activity";
import type { CommunityResourceKind } from "@/lib/community/notebook-attach";
import type { CommunityFeedSort } from "@/lib/community/feed-sort";
import {
  allStudentChannelIds,
  applyChannelActivity,
  buildStudentCommunityChannels,
  findChannelById,
  resolveChannelNavigation,
} from "@/lib/community/channels";
import { markRepliesSeen } from "@/lib/community/reply-notifications";
import { useSupabaseSWR } from "@/lib/hooks/use-supabase-swr";
import { communityCopy } from "@/lib/i18n/community";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchAnswersForPosts,
  fetchChannelActivityBatch,
  fetchChannelPosts,
  fetchHelpfulCounts,
  fetchMyHelpfulPostIds,
  fetchMyReportedPostIds,
  insertCommunityAnswer,
  insertCommunityPost,
  insertPostReport,
  togglePostHelpful,
  type CommunityAnswerRow,
  type CommunityPostRow,
} from "@/lib/supabase/community-db";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { loadSavedPostIds, toggleSavedPostId } from "@/lib/storage/community-saved-storage";

export function CommunityHub() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { profile, locale, authUserId } = useKampus();
  const es = locale === "es";
  const t = communityCopy.es;

  const [context, setContext] = useState<CommunityContext>("subject");
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const highlightPostId = searchParams.get("post");

  const [postBody, setPostBody] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [resourceLabel, setResourceLabel] = useState("");
  const [resourceKind, setResourceKind] = useState<CommunityResourceKind | null>(null);
  const [postBusy, setPostBusy] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerBusyId, setAnswerBusyId] = useState<string | null>(null);
  const [answerError, setAnswerError] = useState<string | null>(null);

  const [feedSort, setFeedSort] = useState<CommunityFeedSort>("recent");
  const [feedFilter, setFeedFilter] = useState<"all" | "saved">("all");
  const [savedPostIds, setSavedPostIds] = useState<Set<string>>(() => new Set(loadSavedPostIds()));

  const canUseCloud = Boolean(isSupabaseConfigured() && authUserId);
  const { notifications, dismiss: dismissReplies } = useCommunityReplyNotifications(authUserId);

  useEffect(() => {
    if (!authUserId) return;
    if (pathname?.startsWith("/community")) {
      markRepliesSeen(authUserId);
    }
  }, [authUserId, pathname]);

  useEffect(() => {
    const raw = searchParams.get("channel");
    if (!raw) return;
    let id = raw;
    try {
      id = decodeURIComponent(raw);
    } catch {
      id = raw;
    }
    const nav = resolveChannelNavigation(profile, id);
    if (nav) {
      setContext(nav.context);
      setSelectedChannelId(id);
    }
  }, [searchParams, profile]);

  const channelIdsForActivity = useMemo(() => {
    const ids = buildStudentCommunityChannels(profile, context, es)
      .filter((c) => !c.disabled)
      .map((c) => c.id);
    return ids;
  }, [profile, context, es]);

  const activitySwrKey = canUseCloud && channelIdsForActivity.length > 0 ? `community_activity:${context}:${authUserId}` : null;

  const { data: activityByChannel = {} } = useSupabaseSWR(activitySwrKey, async (supabase) => {
    return fetchChannelActivityBatch(supabase, channelIdsForActivity, weekAgoIso());
  });

  const channels = useMemo(() => {
    const base = buildStudentCommunityChannels(profile, context, es);
    return applyChannelActivity(base, activityByChannel, es);
  }, [profile, context, es, activityByChannel]);

  const selectedChannel = useMemo(
    () => (selectedChannelId ? findChannelById(profile, selectedChannelId, es, activityByChannel) : null),
    [profile, selectedChannelId, es, activityByChannel],
  );

  const channelDisabled = Boolean(selectedChannel?.disabled);

  useEffect(() => {
    if (!selectedChannelId) return;
    if (!channels.some((c) => c.id === selectedChannelId)) {
      setSelectedChannelId(null);
    }
  }, [channels, selectedChannelId]);

  useEffect(() => {
    if (selectedChannelId) return;
    if (channels.length === 0) return;
    const first = channels.find((c) => !c.disabled) ?? channels[0];
    if (first) setSelectedChannelId(first.id);
  }, [channels, selectedChannelId]);

  const swrKey =
    canUseCloud && selectedChannelId && !channelDisabled
      ? `community_feed:${authUserId}:${selectedChannelId}`
      : null;

  const { data: feedData, mutate: mutateFeed } = useSupabaseSWR<{
    posts: CommunityPostRow[];
    answers: CommunityAnswerRow[];
    helpfulCounts: Record<string, number>;
    myHelpfulPostIds: Set<string>;
    reportedPostIds: Set<string>;
  }>(swrKey, async (supabase) => {
    const posts = await fetchChannelPosts(supabase, selectedChannelId!);
    const postIds = posts.map((p) => p.id);
    const [answers, helpfulCounts, myHelpfulPostIds, reportedPostIds] = await Promise.all([
      fetchAnswersForPosts(supabase, postIds),
      fetchHelpfulCounts(supabase, postIds),
      authUserId ? fetchMyHelpfulPostIds(supabase, authUserId, postIds) : Promise.resolve(new Set<string>()),
      authUserId ? fetchMyReportedPostIds(supabase, authUserId, postIds) : Promise.resolve(new Set<string>()),
    ]);
    return { posts, answers, helpfulCounts, myHelpfulPostIds, reportedPostIds };
  });

  const posts = feedData?.posts ?? [];
  const answersByQuestion = useMemo(() => {
    const grouped: Record<string, CommunityAnswerRow[]> = {};
    (feedData?.answers ?? []).forEach((row) => {
      if (!grouped[row.question_id]) grouped[row.question_id] = [];
      grouped[row.question_id]!.push(row);
    });
    return grouped;
  }, [feedData?.answers]);

  const selectChannel = useCallback(
    (channelId: string) => {
      setSelectedChannelId(channelId);
      const params = new URLSearchParams(searchParams.toString());
      params.set("channel", channelId);
      params.delete("post");
      router.replace(`/community?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  async function submitPost() {
    if (!authUserId || !isSupabaseConfigured()) return;
    const body = postBody.trim();
    if (!body || !selectedChannelId || channelDisabled) {
      if (!selectedChannelId) setPostError(t.selectChannelError);
      return;
    }
    setPostBusy(true);
    setPostError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await insertCommunityPost(supabase, {
        userId: authUserId,
        channelId: selectedChannelId,
        body,
        resourceUrl: resourceUrl.trim() || undefined,
        resourceLabel: resourceLabel.trim() || undefined,
        resourceKind: resourceKind ?? undefined,
      });
      setPostBody("");
      setResourceUrl("");
      setResourceLabel("");
      setResourceKind(null);
      await mutateFeed();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.postError;
      setPostError(msg);
    } finally {
      setPostBusy(false);
    }
  }

  async function submitAnswer(questionId: string) {
    if (!authUserId || !isSupabaseConfigured()) return;
    const body = (answerDrafts[questionId] ?? "").trim();
    if (!body) return;
    setAnswerBusyId(questionId);
    setAnswerError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await insertCommunityAnswer(supabase, { userId: authUserId, questionId, body });
      setAnswerDrafts((prev) => ({ ...prev, [questionId]: "" }));
      await mutateFeed();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t.replyError;
      setAnswerError(msg);
    } finally {
      setAnswerBusyId(null);
    }
  }

  async function handleToggleHelpful(postId: string) {
    if (!authUserId || !feedData) return;
    const isHelpful = feedData.myHelpfulPostIds.has(postId);
    try {
      const supabase = createSupabaseBrowserClient();
      await togglePostHelpful(supabase, authUserId, postId, isHelpful);
      await mutateFeed();
    } catch {
      /* ignore — table may not exist yet */
    }
  }

  function handleToggleSaved(postId: string) {
    toggleSavedPostId(postId);
    setSavedPostIds(new Set(loadSavedPostIds()));
  }

  function handleNotebookAttach(payload: {
    resourceUrl: string;
    resourceLabel: string;
    resourceKind: "notebook";
  }) {
    setResourceUrl(payload.resourceUrl);
    setResourceLabel(payload.resourceLabel);
    setResourceKind(payload.resourceKind);
  }

  async function handleReportPost(postId: string, reason: string, detail: string) {
    if (!authUserId) return;
    const supabase = createSupabaseBrowserClient();
    await insertPostReport(supabase, { userId: authUserId, postId, reason, detail });
    await mutateFeed();
  }

  function clearChannelLink() {
    setSelectedChannelId(null);
    router.replace("/community");
  }

  const totalActivityChannels = allStudentChannelIds(profile).length;

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        actions={
          <div className="flex flex-wrap gap-2">
            <ShareLinkButton
              pathname="/community"
              campaign="community_invite"
              extra={{ channel: selectedChannelId ?? undefined }}
              refHandle={profile.university || "kampus"}
              label={t.inviteCta}
              copiedLabel={t.copied}
            />
            <ShareLinkButton
              pathname="/study/library/rescue"
              campaign="rescue_pack"
              refHandle={profile.university || "kampus"}
              label={t.shareKitCta}
              copiedLabel={t.copied}
            />
          </div>
        }
      />

      {profile.interestedInCommunity !== false ? (
        <CommunityReplyBannerFromNotifications notifications={notifications} onDismiss={dismissReplies} />
      ) : null}

      {profile.interestedInCommunity === false ? (
        <div className="rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
          {t.optOutBanner}{" "}
          <Link href="/settings" className="text-indigo-200 underline-offset-2 hover:underline">
            {t.optOutSettings}
          </Link>
        </div>
      ) : null}

      {selectedChannelId && selectedChannel ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-slate-100">
            <span className="font-semibold text-white">{t.linkedChannel}: </span>
            {selectedChannel.title}
            <span className="mt-1 block text-xs text-slate-300">{t.linkedChannelHint}</span>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={clearChannelLink}>
            {t.clearLink}
          </Button>
        </div>
      ) : null}

      <p className="text-sm text-slate-400">{t.moderationNote}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <StatBlock label={t.channelsInContext} value={channels.length} hint={t.channelsInContextHint} />
        <StatBlock label={t.postCount} value={posts.length} hint={t.activityPostsHint} />
        <StatBlock
          label={t.universityLabel}
          value={profile.university || "—"}
          hint={totalActivityChannels > 0 ? `${totalActivityChannels} canales activos` : profile.semester}
        />
      </div>

      <CommunityChannelPicker
        context={context}
        onContextChange={setContext}
        channels={channels}
        selectedChannelId={selectedChannelId}
        onSelectChannel={selectChannel}
        es={es}
      />

      {selectedChannelId && !channelDisabled ? (
        <CommunityChannelFeed
          posts={posts}
          answersByQuestion={answersByQuestion}
          authUserId={authUserId}
          canPost={canUseCloud}
          channelDisabled={channelDisabled}
          postBody={postBody}
          resourceUrl={resourceUrl}
          resourceLabel={resourceLabel}
          onPostBodyChange={setPostBody}
          onResourceUrlChange={(v) => {
            setResourceUrl(v);
            setResourceKind(null);
          }}
          onResourceLabelChange={setResourceLabel}
          onSubmitPost={() => void submitPost()}
          onClearComposer={() => {
            setPostBody("");
            setResourceUrl("");
            setResourceLabel("");
            setResourceKind(null);
          }}
          postBusy={postBusy}
          postError={postError}
          onSubmitAnswer={(id) => void submitAnswer(id)}
          answerDrafts={answerDrafts}
          onAnswerDraftChange={(questionId, value) =>
            setAnswerDrafts((prev) => ({ ...prev, [questionId]: value }))
          }
          answerBusyId={answerBusyId}
          answerError={answerError}
          feedSort={feedSort}
          onFeedSortChange={setFeedSort}
          feedFilter={feedFilter}
          onFeedFilterChange={setFeedFilter}
          savedPostIds={savedPostIds}
          onToggleSaved={handleToggleSaved}
          helpfulCounts={feedData?.helpfulCounts ?? {}}
          myHelpfulPostIds={feedData?.myHelpfulPostIds ?? new Set()}
          onToggleHelpful={(id) => void handleToggleHelpful(id)}
          highlightPostId={highlightPostId}
          subjects={profile.subjects ?? []}
          onNotebookAttach={handleNotebookAttach}
          reportedPostIds={feedData?.reportedPostIds ?? new Set()}
          onReportPost={handleReportPost}
        />
      ) : channelDisabled ? (
        <Card className="border-white/10 bg-slate-950/40">
          <CardHeader>
            <CardDescription>{t.disabledChannelHint}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-white/10 bg-slate-950/40">
        <CardHeader>
          <CardTitle>{t.roadmapTitle}</CardTitle>
          <CardDescription>{t.roadmapHint}</CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
