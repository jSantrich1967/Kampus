"use client";

import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useKampus } from "@/components/kampus/kampus-provider";
import { activateDemoMode } from "@/lib/demo/activate-demo-mode";

export default function DemoEntryPage() {
  const router = useRouter();
  const { setProfile } = useKampus();

  useEffect(() => {
    const demo = activateDemoMode();
    setProfile(demo);
    router.replace("/today");
  }, [router, setProfile]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#131318] px-6 text-center text-white">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" aria-hidden />
      <p className="text-sm text-gray-400">Preparando demo de Kampus…</p>
    </div>
  );
}
