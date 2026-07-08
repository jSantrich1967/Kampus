"use client";

import { useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import {
  buildExamSubjectMaterialStatus,
  type ExamSubjectMaterialStatus,
} from "@/lib/exams/exam-subject-material";
import type { NotebookDocumentRow } from "@/lib/notebooks/types";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const emptyStatus: ExamSubjectMaterialStatus = {
  pageCount: 0,
  linkedCount: 0,
  hasRealMaterial: false,
  summary: "",
};

export function useExamSubjectMaterial(subject: string): { loading: boolean; material: ExamSubjectMaterialStatus } {
  const { authUserId } = useKampus();
  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured() || !authUserId) {
      setDocs([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    void (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data, error } = await supabase
          .from("notebook_documents")
          .select("*")
          .eq("user_id", authUserId)
          .order("created_at", { ascending: false })
          .limit(200);
        if (error) throw error;
        if (!cancelled) setDocs((data as NotebookDocumentRow[]) ?? []);
      } catch {
        if (!cancelled) setDocs([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const material = useMemo(
    () => (subject.trim() ? buildExamSubjectMaterialStatus(docs, subject) : emptyStatus),
    [docs, subject],
  );

  return { loading, material };
}
