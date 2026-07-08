"use client";

import { useCallback, useEffect, useState } from "react";

import { countDiaryPendingOps, DIARY_PENDING_CHANGED_EVENT } from "@/lib/storage/diary-pending-queue";

export function useDiaryPendingCount(): number {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    setCount(countDiaryPendingOps());
  }, []);

  useEffect(() => {
    refresh();
    const onChange = () => refresh();
    window.addEventListener(DIARY_PENDING_CHANGED_EVENT, onChange);
    window.addEventListener("online", onChange);
    return () => {
      window.removeEventListener(DIARY_PENDING_CHANGED_EVENT, onChange);
      window.removeEventListener("online", onChange);
    };
  }, [refresh]);

  return count;
}
