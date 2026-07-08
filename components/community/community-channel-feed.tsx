"use client";

import Link from "next/link";
import { Bookmark, BookOpen, ExternalLink, MessageCircle, ThumbsUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { CommunityNotebookAttachPicker } from "@/components/community/community-notebook-attach-picker";
import { CommunityReportPostButton } from "@/components/community/community-report-post-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  EmptyState,
  EmptyStateIllustrationCommunity,
  EmptyStatePrimaryCta,
  EmptyStateSecondaryCta,
} from "@/components/ui/empty-state";
import type { CommunityFeedSort } from "@/lib/community/feed-sort";
import { sortCommunityPosts } from "@/lib/community/feed-sort";
import { inferResourceKind } from "@/lib/community/notebook-attach";
import { cn } from "@/lib/cn";
import type { CommunityAnswerRow, CommunityPostRow } from "@/lib/supabase/community-db";
import { communityCopy } from "@/lib/i18n/community";

type CommunityChannelFeedProps = {
  posts: CommunityPostRow[];
  answersByQuestion: Record<string, CommunityAnswerRow[]>;
  authUserId: string | null;
  canPost: boolean;
  channelDisabled?: boolean;
  postBody: string;
  resourceUrl: string;
  resourceLabel: string;
  onPostBodyChange: (value: string) => void;
  onResourceUrlChange: (value: string) => void;
  onResourceLabelChange: (value: string) => void;
  onSubmitPost: () => void;
  onClearComposer: () => void;
  postBusy: boolean;
  postError: string | null;
  onSubmitAnswer: (questionId: string) => void;
  answerDrafts: Record<string, string>;
  onAnswerDraftChange: (questionId: string, value: string) => void;
  answerBusyId: string | null;
  answerError: string | null;
  feedSort: CommunityFeedSort;
  onFeedSortChange: (sort: CommunityFeedSort) => void;
  feedFilter: "all" | "saved";
  onFeedFilterChange: (filter: "all" | "saved") => void;
  savedPostIds: Set<string>;
  onToggleSaved: (postId: string) => void;
  helpfulCounts: Record<string, number>;
  myHelpfulPostIds: Set<string>;
  onToggleHelpful: (postId: string) => void;
  highlightPostId?: string | null;
  subjects: string[];
  onNotebookAttach: (payload: { resourceUrl: string; resourceLabel: string; resourceKind: "notebook" }) => void;
  reportedPostIds: Set<string>;
  onReportPost: (postId: string, reason: string, detail: string) => Promise<void>;
};

export function CommunityChannelFeed({
  posts,
  answersByQuestion,
  authUserId,
  canPost,
  channelDisabled,
  postBody,
  resourceUrl,
  resourceLabel,
  onPostBodyChange,
  onResourceUrlChange,
  onResourceLabelChange,
  onSubmitPost,
  onClearComposer,
  postBusy,
  postError,
  onSubmitAnswer,
  answerDrafts,
  onAnswerDraftChange,
  answerBusyId,
  answerError,
  feedSort,
  onFeedSortChange,
  feedFilter,
  onFeedFilterChange,
  savedPostIds,
  onToggleSaved,
  helpfulCounts,
  myHelpfulPostIds,
  onToggleHelpful,
  highlightPostId,
  subjects,
  onNotebookAttach,
  reportedPostIds,
  onReportPost,
}: CommunityChannelFeedProps) {
  const t = communityCopy.es;

  const sortedPosts = useMemo(
    () => sortCommunityPosts(posts, answersByQuestion, feedSort),
    [posts, answersByQuestion, feedSort],
  );

  const visiblePosts = useMemo(() => {
    if (feedFilter === "saved") return sortedPosts.filter((p) => savedPostIds.has(p.id));
    return sortedPosts;
  }, [sortedPosts, feedFilter, savedPostIds]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      <Card className="border-indigo-400/25 bg-indigo-500/[0.06]">
        <CardHeader>
          <CardTitle>{t.composeTitle}</CardTitle>
          <CardDescription>{t.composeHint}</CardDescription>
        </CardHeader>
        <div className="space-y-3 px-6 pb-6">
          {!authUserId ? (
            <p className="text-sm text-slate-400">{t.signInToPost}</p>
          ) : !canPost ? (
            <p className="text-sm text-slate-400">{t.configureSupabase}</p>
          ) : channelDisabled ? (
            <p className="text-sm text-amber-200/90">{t.disabledChannelHint}</p>
          ) : (
            <>
              <textarea
                id="community-post-composer"
                className="min-h-[90px] w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                placeholder={t.postPlaceholder}
                value={postBody}
                onChange={(e) => onPostBodyChange(e.target.value)}
                maxLength={1200}
              />
              <CommunityNotebookAttachPicker subjects={subjects} onAttach={onNotebookAttach} />
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block text-xs text-slate-400">
                  {t.resourceUrlLabel}
                  <input
                    type="url"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                    placeholder={t.resourceUrlPlaceholder}
                    value={resourceUrl}
                    onChange={(e) => onResourceUrlChange(e.target.value)}
                    maxLength={500}
                  />
                </label>
                <label className="block text-xs text-slate-400">
                  {t.resourceLabelLabel}
                  <input
                    type="text"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                    placeholder={t.resourceLabelPlaceholder}
                    value={resourceLabel}
                    onChange={(e) => onResourceLabelChange(e.target.value)}
                    maxLength={120}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="gap-2"
                  disabled={postBusy || !postBody.trim()}
                  onClick={() => onSubmitPost()}
                >
                  {postBusy ? t.posting : t.postCta}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={postBusy}
                  onClick={onClearComposer}
                >
                  {t.clearCta}
                </Button>
                {postError ? <span className="text-xs text-rose-300">{postError}</span> : null}
              </div>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="inline-flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-indigo-200" aria-hidden />
                {t.feedTitle}
              </CardTitle>
              <CardDescription>{t.feedHint}</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex rounded-lg border border-white/10 p-0.5">
                {(["recent", "trending"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition",
                      feedSort === mode ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200",
                    )}
                    onClick={() => onFeedSortChange(mode)}
                  >
                    {mode === "recent" ? t.sortRecent : t.sortTrending}
                  </button>
                ))}
              </div>
              <div className="flex rounded-lg border border-white/10 p-0.5">
                {(["all", "saved"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    className={cn(
                      "rounded-md px-3 py-1 text-xs font-medium transition",
                      feedFilter === mode ? "bg-white/15 text-white" : "text-slate-400 hover:text-slate-200",
                    )}
                    onClick={() => onFeedFilterChange(mode)}
                  >
                    {mode === "all" ? t.filterAll : t.filterSaved}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <div className="space-y-4 px-6 pb-6">
          {visiblePosts.length === 0 ? (
            <EmptyState
              icon={<EmptyStateIllustrationCommunity />}
              title={t.emptyTitle}
              description={feedFilter === "saved" ? "No tienes posts guardados en este canal." : t.emptyDescription}
              actions={
                authUserId && canPost && !channelDisabled && feedFilter === "all" ? (
                  <>
                    <EmptyStatePrimaryCta
                      onClick={() => document.getElementById("community-post-composer")?.focus()}
                    >
                      {t.emptyFirstPost}
                    </EmptyStatePrimaryCta>
                    <Link href="/collaborate/aula-virtual">
                      <EmptyStateSecondaryCta>{t.emptyStudyGroup}</EmptyStateSecondaryCta>
                    </Link>
                  </>
                ) : feedFilter === "saved" ? (
                  <EmptyStatePrimaryCta onClick={() => onFeedFilterChange("all")}>
                    {t.filterAll}
                  </EmptyStatePrimaryCta>
                ) : (
                  <>
                    <Link href="/login">
                      <EmptyStatePrimaryCta>{t.signInPrimary}</EmptyStatePrimaryCta>
                    </Link>
                    <Link href="/register">
                      <EmptyStateSecondaryCta>{t.createAccount}</EmptyStateSecondaryCta>
                    </Link>
                  </>
                )
              }
            />
          ) : (
            visiblePosts.map((p) => (
              <CommunityPostThread
                key={p.id}
                post={p}
                answers={answersByQuestion[p.id] ?? []}
                authUserId={authUserId}
                canReply={canPost && !channelDisabled}
                answerDraft={answerDrafts[p.id] ?? ""}
                onAnswerDraftChange={(v) => onAnswerDraftChange(p.id, v)}
                onSubmitAnswer={() => onSubmitAnswer(p.id)}
                answerBusy={answerBusyId === p.id}
                answerError={answerBusyId === p.id ? answerError : null}
                isSaved={savedPostIds.has(p.id)}
                onToggleSaved={() => onToggleSaved(p.id)}
                helpfulCount={helpfulCounts[p.id] ?? 0}
                isHelpful={myHelpfulPostIds.has(p.id)}
                onToggleHelpful={() => onToggleHelpful(p.id)}
                showTrending={
                  feedSort === "trending" &&
                  (answersByQuestion[p.id]?.filter((a) => new Date(a.created_at).getTime() >= weekAgo).length ?? 0) >= 2
                }
                highlighted={highlightPostId === p.id}
                alreadyReported={reportedPostIds.has(p.id)}
                onReportPost={(reason, detail) => onReportPost(p.id, reason, detail)}
              />
            ))
          )}
        </div>
      </Card>
    </div>
  );
}

function CommunityPostThread({
  post,
  answers,
  authUserId,
  canReply,
  answerDraft,
  onAnswerDraftChange,
  onSubmitAnswer,
  answerBusy,
  answerError,
  isSaved,
  onToggleSaved,
  helpfulCount,
  isHelpful,
  onToggleHelpful,
  showTrending,
  highlighted,
  alreadyReported,
  onReportPost,
}: {
  post: CommunityPostRow;
  answers: CommunityAnswerRow[];
  authUserId: string | null;
  canReply: boolean;
  answerDraft: string;
  onAnswerDraftChange: (value: string) => void;
  onSubmitAnswer: () => void;
  answerBusy: boolean;
  answerError: string | null;
  isSaved: boolean;
  onToggleSaved: () => void;
  helpfulCount: number;
  isHelpful: boolean;
  onToggleHelpful: () => void;
  showTrending: boolean;
  highlighted: boolean;
  alreadyReported: boolean;
  onReportPost: (reason: string, detail: string) => Promise<void>;
}) {
  const t = communityCopy.es;
  const [expanded, setExpanded] = useState(answers.length > 0);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!highlighted || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [highlighted]);

  const resourceHref = post.resource_url?.trim();
  const resourceTitle = post.resource_label?.trim() || t.openResource;
  const kind = inferResourceKind(resourceHref, post.resource_kind);
  const isNotebook = kind === "notebook";

  return (
    <article
      ref={ref}
      id={`community-post-${post.id}`}
      className={cn(
        "rounded-2xl border bg-slate-950/40 p-4 transition",
        highlighted ? "border-indigo-400/60 ring-2 ring-indigo-400/30" : "border-white/10",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[11px] text-slate-500">
          {t.postedAt}{" "}
          <span suppressHydrationWarning>
            {new Date(post.created_at).toLocaleString("es", { dateStyle: "medium", timeStyle: "short" })}
          </span>
        </div>
        {showTrending ? <Badge tone="warning">{t.trendingBadge}</Badge> : null}
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-100">{post.body}</p>

      {resourceHref ? (
        isNotebook ? (
          <Link href={resourceHref} className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-200 hover:text-white">
            <BookOpen className="h-4 w-4" aria-hidden />
            {resourceTitle || t.openNotebook}
          </Link>
        ) : (
          <a
            href={resourceHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-200 hover:text-white"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {resourceTitle}
          </a>
        )
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={onToggleSaved}>
          <Bookmark className={cn("h-4 w-4", isSaved && "fill-current text-amber-300")} aria-hidden />
          {isSaved ? t.savedActive : t.savedCta}
        </Button>
        {authUserId ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="gap-1.5"
            disabled={post.user_id === authUserId}
            onClick={onToggleHelpful}
          >
            <ThumbsUp className={cn("h-4 w-4", isHelpful && "text-emerald-300")} aria-hidden />
            {isHelpful ? t.helpfulActive : t.helpfulCta}
            {helpfulCount > 0 ? <span className="text-slate-400">· {t.helpfulCount(helpfulCount)}</span> : null}
          </Button>
        ) : null}
      </div>

      {authUserId && post.user_id !== authUserId ? (
        <CommunityReportPostButton
          alreadyReported={alreadyReported}
          onReport={onReportPost}
        />
      ) : null}

      {answers.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
          <div className="text-xs font-medium text-slate-400">{t.answersTitle(answers.length)}</div>
          {answers.map((a) => (
            <div key={a.id} className="rounded-xl border border-white/5 bg-black/20 px-3 py-2">
              <p className="whitespace-pre-wrap text-sm text-slate-200">{a.body}</p>
              <div className="mt-1 text-[10px] text-slate-500" suppressHydrationWarning>
                {new Date(a.created_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {authUserId && canReply ? (
        <div className="mt-4 space-y-2">
          {!expanded && answers.length === 0 ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded(true)}>
              {t.replyCta}
            </Button>
          ) : (
            <>
              <textarea
                className="min-h-[72px] w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                placeholder={t.replyPlaceholder}
                value={answerDraft}
                onChange={(e) => onAnswerDraftChange(e.target.value)}
                maxLength={2000}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={answerBusy || !answerDraft.trim()}
                  onClick={() => onSubmitAnswer()}
                >
                  {answerBusy ? t.replying : t.replyCta}
                </Button>
                {answerError ? <span className="text-xs text-rose-300">{answerError}</span> : null}
              </div>
            </>
          )}
        </div>
      ) : null}
    </article>
  );
}
