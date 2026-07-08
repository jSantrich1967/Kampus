"use client";

import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { buildVirtualSessionHref } from "@/lib/collaborate/virtual-session-path";
import {
  isVirtualSessionSoon,
  VIRTUAL_SESSIONS_CHANGED_EVENT,
} from "@/lib/collaborate/virtual-session-urgency";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type VirtualSessionFocus = {
  id: string;
  course: string;
  startsAt: string;
  href: string;
  hoursUntil: number;
};

export function useUpcomingVirtualSessions(windowHours = 24): {
  count: number;
  next: VirtualSessionFocus | null;
  loading: boolean;
} {
  const { authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const [count, setCount] = useState(0);
  const [next, setNext] = useState<VirtualSessionFocus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!useCloud) {
      setCount(0);
      setNext(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const now = new Date();
      const from = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      const to = new Date(now.getTime() + windowHours * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from("virtual_class_sessions")
        .select("id,course,starts_at")
        .gte("starts_at", from)
        .lte("starts_at", to)
        .order("starts_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      const rows = (data ?? []).filter((r) => isVirtualSessionSoon(String(r.starts_at), windowHours, now));
      setCount(rows.length);
      const first = rows[0];
      if (first) {
        const startsAt = String(first.starts_at);
        setNext({
          id: String(first.id),
          course: String(first.course),
          startsAt,
          href: buildVirtualSessionHref(String(first.id)),
          hoursUntil: (new Date(startsAt).getTime() - now.getTime()) / (3600 * 1000),
        });
      } else {
        setNext(null);
      }
    } catch {
      setCount(0);
      setNext(null);
    } finally {
      setLoading(false);
    }
  }, [useCloud, authUserId, windowHours]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    const onChange = () => void refresh();
    window.addEventListener(VIRTUAL_SESSIONS_CHANGED_EVENT, onChange);
    return () => window.removeEventListener(VIRTUAL_SESSIONS_CHANGED_EVENT, onChange);
  }, [refresh]);

  return { count, next, loading };
}
