"use client";

import Link from "next/link";
import { MessageCircle, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildCommunityPostHref } from "@/lib/community/reply-notifications";
import { communityCopy } from "@/lib/i18n/community";

type CommunityReplyBannerProps = {
  count: number;
  preview?: string;
  href?: string;
  onDismiss: () => void;
};

export function CommunityReplyBanner({ count, preview, href, onDismiss }: CommunityReplyBannerProps) {
  const t = communityCopy.es;
  if (count <= 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-3">
        <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" aria-hidden />
        <div className="text-sm text-slate-100">
          <span className="font-semibold text-white">{t.replyBannerTitle(count)}</span>
          {preview ? <p className="mt-1 text-slate-300">&ldquo;{preview}&rdquo;</p> : null}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {href ? (
          <Link href={href}>
            <Button size="sm" variant="secondary">
              {t.replyBannerCta}
            </Button>
          </Link>
        ) : (
          <Link href="/community">
            <Button size="sm" variant="secondary">
              {t.replyBannerCta}
            </Button>
          </Link>
        )}
        <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={onDismiss}>
          <X className="h-4 w-4" aria-hidden />
          {t.replyBannerDismiss}
        </Button>
      </div>
    </div>
  );
}

export function CommunityReplyBannerFromNotifications({
  notifications,
  onDismiss,
}: {
  notifications: { channelId: string; postId: string; bodyPreview: string }[];
  onDismiss: () => void;
}) {
  if (notifications.length === 0) return null;
  const first = notifications[0]!;
  const href = buildCommunityPostHref(first.channelId, first.postId);
  return (
    <CommunityReplyBanner
      count={notifications.length}
      preview={first.bodyPreview}
      href={href}
      onDismiss={onDismiss}
    />
  );
}
