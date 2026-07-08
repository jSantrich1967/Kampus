import type { SupabaseClient } from "@supabase/supabase-js";

import type { PushSubscriptionRow } from "@/lib/wellbeing/web-push-server";

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  authKey: string;
  userAgent?: string;
};

export async function upsertWellbeingPushSubscription(
  client: SupabaseClient,
  userId: string,
  input: PushSubscriptionInput,
): Promise<void> {
  const { error } = await client.from("wellbeing_push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth_key: input.authKey,
      user_agent: input.userAgent ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,endpoint" },
  );
  if (error) throw error;
}

export async function deleteWellbeingPushSubscription(
  client: SupabaseClient,
  userId: string,
  endpoint: string,
): Promise<void> {
  const { error } = await client
    .from("wellbeing_push_subscriptions")
    .delete()
    .eq("user_id", userId)
    .eq("endpoint", endpoint);
  if (error) throw error;
}

export async function listAllWellbeingPushSubscriptions(client: SupabaseClient): Promise<PushSubscriptionRow[]> {
  const { data, error } = await client.from("wellbeing_push_subscriptions").select("endpoint, p256dh, auth_key");
  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}

export async function listWellbeingPushSubscriptionsForUser(
  client: SupabaseClient,
  userId: string,
): Promise<PushSubscriptionRow[]> {
  const { data, error } = await client
    .from("wellbeing_push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}

export async function deletePushSubscriptionsByEndpoints(
  client: SupabaseClient,
  endpoints: string[],
): Promise<void> {
  if (endpoints.length === 0) return;
  const { error } = await client.from("wellbeing_push_subscriptions").delete().in("endpoint", endpoints);
  if (error) throw error;
}
