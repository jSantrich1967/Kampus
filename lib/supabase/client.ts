"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabasePublicEnv } from "./env";

/**
 * Browser Supabase client. Use inside Client Components after checking
 * {@link isSupabaseConfigured} if the feature should work without Supabase in dev.
 */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabasePublicEnv();
  return createBrowserClient(url, anonKey, { isSingleton: true });
}
