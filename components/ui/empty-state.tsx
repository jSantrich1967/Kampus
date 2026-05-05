"use client";

import type { ReactNode } from "react";
import { useId } from "react";

import { cn } from "@/lib/cn";
import { Button } from "./button";
import { Card, CardDescription, CardHeader, CardTitle } from "./card";

function svgId(raw: string) {
  return raw.replace(/:/g, "");
}

/** Chat bubbles + dots — for community empty states */
export function EmptyStateIllustrationCommunity() {
  const uid = svgId(useId());
  return (
    <svg
      width="176"
      height="160"
      viewBox="0 0 176 160"
      aria-hidden="true"
      className="mx-auto h-36 w-40 shrink-0 text-indigo-300/90 md:h-40 md:w-44"
    >
      <defs>
        <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.22" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.06" />
        </linearGradient>
        <linearGradient id={`${uid}-bubble`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5b4fc" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <circle cx="88" cy="82" r="62" fill={`url(#${uid}-bg)`} />
      <rect
        x="28"
        y="38"
        width="92"
        height="44"
        rx="14"
        fill={`url(#${uid}-bubble)`}
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M62 82 L52 96 L58 78 Z"
        fill={`url(#${uid}-bubble)`}
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="1"
      />
      <rect
        x="56"
        y="92"
        width="100"
        height="40"
        rx="12"
        fill="rgba(15,23,42,0.55)"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="1.5"
      />
      <circle cx="48" cy="58" r="4" fill="currentColor" fillOpacity="0.45" />
      <circle cx="62" cy="58" r="4" fill="currentColor" fillOpacity="0.32" />
      <circle cx="76" cy="58" r="4" fill="currentColor" fillOpacity="0.2" />
      <rect x="72" y="108" width="48" height="6" rx="3" fill="currentColor" fillOpacity="0.2" />
      <rect x="72" y="118" width="72" height="5" rx="2.5" fill="currentColor" fillOpacity="0.12" />
    </svg>
  );
}

/** Open notebook — for library / reader empty states */
export function EmptyStateIllustrationNotebook() {
  const uid = svgId(useId());
  return (
    <svg
      width="176"
      height="160"
      viewBox="0 0 176 160"
      aria-hidden="true"
      className="mx-auto h-36 w-40 shrink-0 text-cyan-300/85 md:h-40 md:w-44"
    >
      <defs>
        <linearGradient id={`${uid}-cover`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#22d3ee" stopOpacity="0.35" />
          <stop offset="1" stopColor="#6366f1" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={`${uid}-page`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgba(241,245,249,0.12)" />
          <stop offset="1" stopColor="rgba(241,245,249,0.04)" />
        </linearGradient>
      </defs>
      <ellipse cx="88" cy="88" rx="64" ry="58" fill="currentColor" fillOpacity="0.08" />
      <path
        d="M52 44 L124 44 L124 118 Q88 128 52 118 Z"
        fill={`url(#${uid}-cover)`}
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <path
        d="M88 44 L124 44 L124 118 Q88 128 88 118 Z"
        fill={`url(#${uid}-page)`}
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="1"
      />
      <line x1="96" y1="58" x2="116" y2="58" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" strokeLinecap="round" />
      <line x1="96" y1="72" x2="118" y2="72" stroke="currentColor" strokeOpacity="0.18" strokeWidth="2" strokeLinecap="round" />
      <line x1="96" y1="86" x2="114" y2="86" stroke="currentColor" strokeOpacity="0.14" strokeWidth="2" strokeLinecap="round" />
      <rect x="60" y="56" width="22" height="52" rx="3" fill="rgba(15,23,42,0.65)" stroke="currentColor" strokeOpacity="0.3" />
      <line x1="66" y1="66" x2="78" y2="66" stroke="currentColor" strokeOpacity="0.35" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="66" y1="76" x2="78" y2="76" stroke="currentColor" strokeOpacity="0.22" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="66" y1="86" x2="76" y2="86" stroke="currentColor" strokeOpacity="0.16" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DefaultIllustration() {
  const uid = svgId(useId());
  return (
    <svg
      width="160"
      height="160"
      viewBox="0 0 160 160"
      aria-hidden="true"
      className="mx-auto h-36 w-36 shrink-0 text-indigo-300/50 md:h-40 md:w-40"
    >
      <defs>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.55" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      <circle cx="80" cy="80" r="58" fill={`url(#${uid}-g)`} />
      <path
        d="M60 88c0-14 9-25 20-25s20 11 20 25"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.55"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M52 90h56"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d="M108 50l6-12m-62 12-6-12m66 68 12 6m-88-6-12 6"
        stroke="currentColor"
        strokeOpacity="0.28"
        strokeWidth="6"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Props = {
  title: string;
  description: string;
  actions?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

export function EmptyState({ title, description, actions, className, icon }: Props) {
  return (
    <Card className={cn("border-white/10 bg-slate-950/40", className)}>
      <div className="flex flex-col gap-6 md:grid md:grid-cols-[1fr_auto] md:items-center">
        <CardHeader className="order-2 mb-0">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
          {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}
        </CardHeader>
        <div className="order-1 flex justify-center md:justify-end md:pl-2">
          {icon ?? <DefaultIllustration />}
        </div>
      </div>
    </Card>
  );
}

export function EmptyStatePrimaryCta({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button type="button" onClick={onClick}>
      {children}
    </Button>
  );
}

export function EmptyStateSecondaryCta({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Button type="button" variant="secondary" onClick={onClick}>
      {children}
    </Button>
  );
}
