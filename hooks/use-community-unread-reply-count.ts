"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { fetchUnreadRepliesToMyPosts, loadReplySeenAt } from "@/lib/community/reply-notifications";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

/**
 * Unread replies to the user's community posts — for sidebar badge.
 * Does not mutate "seen" state (that happens via banner dismiss or visiting /community).
 */
export function useCommunityUnreadReplyCount(): number {
  const { hydrated, authUserId, profile } = useKampus();
  const enabled = Boolean(
    hydrated && authUserId && isSupabaseConfigured() && profile.interestedInCommunity !== false,
  );
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!enabled || !authUserId) {
      setCount(0);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const since = loadReplySeenAt(authUserId);
      const list = await fetchUnreadRepliesToMyPosts(supabase, authUserId, since);
      setCount(list.length);
    } catch {
      setCount(0);
    }
  }, [enabled, authUserId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  return count;
}
