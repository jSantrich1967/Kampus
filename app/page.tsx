import { redirect } from "next/navigation";

import { KampusLuminaHome } from "@/components/landing/kampus-lumina-home";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fetchProfileForUser } from "@/lib/supabase/profile-sync";

export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const p = await fetchProfileForUser(supabase, user.id).catch(() => null);
    if (!p?.onboardingFinished) redirect("/onboarding");
    redirect("/today");
  }

  return <KampusLuminaHome />;
}
