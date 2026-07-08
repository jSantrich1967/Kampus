"use client";

import { useCallback, useEffect, useState } from "react";

import { loadReplySeenAt, markRepliesSeen, fetchUnreadRepliesToMyPosts, type CommunityReplyNotification } from "@/lib/community/reply-notifications";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export function useCommunityReplyNotifications(authUserId: string | null) {
  const [notifications, setNotifications] = useState<CommunityReplyNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const since = loadReplySeenAt(authUserId);
      const list = await fetchUnreadRepliesToMyPosts(supabase, authUserId, since);
      setNotifications(list);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const dismiss = useCallback(() => {
    if (!authUserId) return;
    markRepliesSeen(authUserId);
    setNotifications([]);
  }, [authUserId]);

  return { notifications, loading, refresh, dismiss, count: notifications.length };
}
