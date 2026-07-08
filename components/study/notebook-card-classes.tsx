"use client";

import Link from "next/link";

import { libraryCopy } from "@/lib/i18n/library";
import type { NotebookClassSummary } from "@/lib/study/notebook-class-summary";

type NotebookCardClassesProps = {
  classes: NotebookClassSummary[];
};

export function NotebookCardClasses({ classes }: NotebookCardClassesProps) {
  const t = libraryCopy.es;
  const recent = classes.filter((c) => c.classDate).slice(0, 2);
  const unlinked = classes.filter((c) => !c.classDate).length;

  if (!classes.length) {
    return <p className="relative z-10 mt-3 text-xs text-slate-500">{t.cardNoClasses}</p>;
  }

  if (!recent.length) {
    return (
      <p className="relative z-10 mt-3 text-xs text-amber-200/80">
        {t.cardUnlinkedOnly(unlinked)}
      </p>
    );
  }

  return (
    <ul className="relative z-10 mt-3 space-y-1.5">
      {recent.map((session) => (
        <li key={session.key}>
          <Link
            href={session.openHref}
            className="block truncate rounded-lg border border-white/5 bg-black/20 px-2.5 py-1.5 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {session.label}
            <span className="text-slate-500"> · {session.pageCount} pág.</span>
          </Link>
        </li>
      ))}
      {classes.length > recent.length ? (
        <li className="text-[11px] text-slate-500">{t.cardMoreClasses(classes.length - recent.length)}</li>
      ) : null}
    </ul>
  );
}
