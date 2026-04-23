"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";

export default function HomePage() {
  const router = useRouter();
  const { profile, hydrated } = useKampus();

  useEffect(() => {
    if (!hydrated) return;
    if (!profile.onboardingFinished) router.replace("/onboarding");
    else router.replace("/today");
  }, [hydrated, profile.onboardingFinished, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-slate-400">
      Loading Kampus…
    </div>
  );
}
