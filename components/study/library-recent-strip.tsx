"use client";

import { Clock } from "lucide-react";
import Link from "next/link";

import { formatShortEdit } from "@/lib/study/library-lumina";
import { libraryCopy } from "@/lib/i18n/library";
import type { NotebookCardInsight } from "@/lib/study/notebook-insights";

type LibraryRecentStripProps = {
  items: NotebookCardInsight[];
};

export function LibraryRecentStrip({ items }: LibraryRecentStripProps) {
  const t = libraryCopy.es;
  if (!items.length) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Clock className="h-3.5 w-3.5" aria-hidden />
        {t.recentStripTitle}
      </p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((item) => (
          <Link
            key={item.subject}
            href={item.href}
            className="min-w-[10rem] shrink-0 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
          >
            <p className="truncate text-sm font-semibold text-white">{item.subject}</p>
            <p className="mt-0.5 text-xs text-slate-400">
              {item.pageCount} apunte{item.pageCount === 1 ? "" : "s"}
              {item.lastEditIso ? ` · ${formatShortEdit(item.lastEditIso)}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
