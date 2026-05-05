"use client";

import useSWR from "swr";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type SwrSupabaseResult<T> = {
  data: T | undefined;
  error: string | null;
  isLoading: boolean;
  mutate: () => Promise<T | undefined>;
};

export function useSupabaseSWR<T>(
  key: string | null,
  fetcher: (supabase: ReturnType<typeof createSupabaseBrowserClient>) => Promise<T>,
): SwrSupabaseResult<T> {
  const swr = useSWR<T>(
    isSupabaseConfigured() && key ? key : null,
    async () => {
      const supabase = createSupabaseBrowserClient();
      return await fetcher(supabase);
    },
  );

  return {
    data: swr.data,
    error: swr.error ? String((swr.error as { message?: unknown })?.message ?? swr.error) : null,
    isLoading: Boolean(swr.isLoading),
    mutate: async () => (await swr.mutate()) as T | undefined,
  };
}

