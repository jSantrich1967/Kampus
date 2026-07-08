"use client";

import { useEffect } from "react";

import { fireCollaborationDeadlineNotification } from "@/lib/collaborate/deadline-notify";
import { loadCollaborateDeadlineNotifyEnabled } from "@/lib/collaborate/deadline-notify-storage";
import { useCollaborationFocusItems } from "@/hooks/use-collaboration-focus-items";

/** Fires at most one deadline notification per day when enabled. */
export function useCollaborationDeadlineReminder(): void {
  const { items, loading } = useCollaborationFocusItems();

  useEffect(() => {
    if (loading || !loadCollaborateDeadlineNotifyEnabled()) return;
    void fireCollaborationDeadlineNotification(items);
    const id = window.setInterval(() => {
      void fireCollaborationDeadlineNotification(items);
    }, 60_000 * 30);
    return () => window.clearInterval(id);
  }, [items, loading]);
}
