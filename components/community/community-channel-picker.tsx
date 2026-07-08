"use client";

import { Users } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CommunityContext } from "@/lib/community-types";
import {
  heatLabel,
  heatTone,
  STUDENT_COMMUNITY_CONTEXTS,
  type CommunityChannel,
} from "@/lib/community/channels";
import { communityCopy } from "@/lib/i18n/community";
import { cn } from "@/lib/cn";

type CommunityChannelPickerProps = {
  context: CommunityContext;
  onContextChange: (context: CommunityContext) => void;
  channels: CommunityChannel[];
  selectedChannelId: string | null;
  onSelectChannel: (channelId: string) => void;
  es: boolean;
};

export function CommunityChannelPicker({
  context,
  onContextChange,
  channels,
  selectedChannelId,
  onSelectChannel,
  es,
}: CommunityChannelPickerProps) {
  const t = communityCopy.es;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Users className="h-5 w-5 text-indigo-200" aria-hidden />
          {t.recommendedTitle}
        </CardTitle>
        <CardDescription>{t.recommendedHint}</CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        <div className="flex flex-wrap gap-2">
          {STUDENT_COMMUNITY_CONTEXTS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-medium transition",
                context === c.id
                  ? "bg-indigo-500/30 text-white ring-1 ring-indigo-400/40"
                  : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white",
              )}
              onClick={() => onContextChange(c.id)}
            >
              {es ? c.es : c.en}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {channels.length === 0 ? (
            <p className="text-sm text-slate-400">{t.noSubjectsHint}</p>
          ) : (
            channels.map((ch) => (
              <div
                key={ch.id}
                role="button"
                tabIndex={ch.disabled ? -1 : 0}
                aria-disabled={ch.disabled}
                onClick={() => {
                  if (!ch.disabled) onSelectChannel(ch.id);
                }}
                onKeyDown={(e) => {
                  if (ch.disabled) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectChannel(ch.id);
                  }
                }}
                className={cn(
                  "rounded-2xl border bg-slate-950/40 p-4 text-left transition",
                  ch.disabled
                    ? "cursor-not-allowed border-white/5 opacity-60"
                    : "cursor-pointer hover:bg-slate-900/60",
                  !ch.disabled && ch.id === selectedChannelId
                    ? "border-indigo-400/50 ring-2 ring-indigo-400/30"
                    : !ch.disabled
                      ? "border-white/10 hover:border-white/20"
                      : "border-white/5",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{ch.title}</div>
                    <div className="mt-1 text-sm text-slate-400">{ch.subtitle}</div>
                  </div>
                  {!ch.disabled ? <Badge tone={heatTone(ch.heat)}>{heatLabel(ch.heat, es)}</Badge> : null}
                </div>
                {!ch.disabled ? (
                  <div className="mt-3 text-xs text-slate-400">
                    <Link
                      href="/collaborate/aula-virtual"
                      className="text-indigo-200 hover:text-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {t.studyGroupCta}
                    </Link>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  );
}
