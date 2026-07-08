"use client";

import { BookOpen } from "lucide-react";

import { Button } from "@/components/ui/button";
import { buildNotebookResourceAttach } from "@/lib/community/notebook-attach";
import { communityCopy } from "@/lib/i18n/community";

type CommunityNotebookAttachPickerProps = {
  subjects: string[];
  onAttach: (payload: { resourceUrl: string; resourceLabel: string; resourceKind: "notebook" }) => void;
};

export function CommunityNotebookAttachPicker({ subjects, onAttach }: CommunityNotebookAttachPickerProps) {
  const t = communityCopy.es;
  const list = subjects.filter((s) => s.trim()).slice(0, 12);

  if (list.length === 0) return null;

  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-300">
        <BookOpen className="h-3.5 w-3.5 text-indigo-300" aria-hidden />
        {t.attachNotebookTitle}
      </div>
      <p className="mb-2 text-[11px] text-slate-500">{t.attachNotebookHint}</p>
      <div className="flex flex-wrap gap-2">
        {list.map((subject) => (
          <Button
            key={subject}
            type="button"
            size="sm"
            variant="ghost"
            className="text-xs"
            onClick={() => onAttach(buildNotebookResourceAttach(subject))}
          >
            {subject}
          </Button>
        ))}
      </div>
    </div>
  );
}
