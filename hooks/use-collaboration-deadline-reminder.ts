"use client";

import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { fireCollaborationDeadlineNotification } from "@/lib/collaborate/deadline-notify";
import { loadCollaborateDeadlineNotifyEnabled } from "@/lib/collaborate/deadline-notify-storage";
import { useCollaborationFocusItems } from "@/hooks/use-collaboration-focus-items";

/** Fires at most one deadline notification per day when enabled. */
export function useCollaborationDeadlineReminder(): void {
  const { authUserId } = useKampus();
  const { items, loading } = useCollaborationFocusItems();

  useEffect(() => {
    if (loading || !loadCollaborateDeadlineNotifyEnabled(authUserId)) return;
    void fireCollaborationDeadlineNotification(items, authUserId);
    const id = window.setInterval(() => {
      void fireCollaborationDeadlineNotification(items, authUserId);
    }, 60_000 * 30);
    return () => window.clearInterval(id);
  }, [authUserId, items, loading]);
}
