"use client";

import { ExternalLink, Video } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { resolveVirtualClassVideoEmbed } from "@/lib/collaborate/virtual-class-video-embed";
import { collaborateCopy } from "@/lib/i18n/collaborate";

type Props = {
  videoUrl: string | null;
  compact?: boolean;
};

export function CollaborateVideoEmbed({ videoUrl, compact }: Props) {
  const t = collaborateCopy.es;
  const video = resolveVirtualClassVideoEmbed({ embedVideoUrl: videoUrl, joinUrl: videoUrl });

  if (!videoUrl?.trim() || video.kind === "none") return null;

  return (
    <div className={compact ? "space-y-2" : "space-y-3"}>
      {video.embedSrc ? (
        <div
          className={
            compact
              ? "aspect-video max-h-40 overflow-hidden rounded-lg border border-white/10 bg-black"
              : "aspect-video overflow-hidden rounded-xl border border-white/10 bg-black"
          }
        >
          <iframe
            title={t.breakoutVideoTitle}
            src={video.embedSrc}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            allowFullScreen
          />
        </div>
      ) : video.kind === "meet" || video.kind === "zoom" ? (
        <p className="text-xs text-slate-400">{t.virtualClassVideoMeetZoomHint}</p>
      ) : null}
      {video.openUrl ? (
        <a
          href={video.openUrl}
          target="_blank"
          rel="noreferrer"
          className={buttonClasses({ variant: "secondary", size: compact ? "sm" : "md", className: "gap-2" })}
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {t.breakoutVideoOpenCall}
        </a>
      ) : null}
      {!video.embedSrc && video.kind !== "meet" && video.kind !== "zoom" ? (
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Video className="h-3.5 w-3.5" aria-hidden />
          {t.breakoutVideoUnsupported}
        </p>
      ) : null}
    </div>
  );
}
