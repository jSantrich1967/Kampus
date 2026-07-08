"use client";

import { ExternalLink, Video } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { resolveVirtualClassVideoEmbed } from "@/lib/collaborate/virtual-class-video-embed";
import { collaborateCopy } from "@/lib/i18n/collaborate";

type Props = {
  embedVideoUrl: string | null;
  joinUrl: string | null;
};

export function VirtualClassVideoPanel({ embedVideoUrl, joinUrl }: Props) {
  const t = collaborateCopy.es;
  const video = resolveVirtualClassVideoEmbed({ embedVideoUrl, joinUrl });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Video className="h-5 w-5 text-teal-300" aria-hidden />
          {t.virtualClassVideoTitle}
        </CardTitle>
        <CardDescription>
          {video.providerLabel ? t.virtualClassVideoProvider(video.providerLabel) : t.virtualClassVideoHint}
        </CardDescription>
      </CardHeader>
      <div className="space-y-3 px-6 pb-6">
        {video.embedSrc ? (
          <div className="aspect-video overflow-hidden rounded-xl border border-white/10 bg-black">
            <iframe
              title={t.virtualClassVideoTitle}
              src={video.embedSrc}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : video.kind === "meet" || video.kind === "zoom" ? (
          <p className="text-sm text-slate-400">{t.virtualClassVideoMeetZoomHint}</p>
        ) : (
          <p className="text-sm text-slate-400">{t.virtualClassVideoEmpty}</p>
        )}
        {video.openUrl ? (
          <a href={video.openUrl} target="_blank" rel="noreferrer" className={buttonClasses({ variant: "secondary", className: "gap-2" })}>
            <ExternalLink className="h-4 w-4" />
            {t.virtualClassVideoOpenCall}
          </a>
        ) : null}
      </div>
    </Card>
  );
}
