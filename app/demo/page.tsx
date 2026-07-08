"use client";

import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useKampus } from "@/components/kampus/kampus-provider";
import { buildDemoProfile } from "@/lib/demo/demo-profile";
import { buildDemoClassScheduleRows } from "@/lib/demo/demo-class-schedule";
import { seedDemoStudyStreak } from "@/lib/demo/demo-study-streak";
import { saveProfile } from "@/lib/storage/kampus-storage";
import { loadClassSchedule, saveClassSchedule } from "@/lib/storage/class-schedule-storage";

export default function DemoEntryPage() {
  const router = useRouter();
  const { setProfile } = useKampus();

  useEffect(() => {
    const demo = buildDemoProfile();
    saveProfile(demo);
    setProfile(demo);
    if (loadClassSchedule().length === 0) {
      saveClassSchedule(buildDemoClassScheduleRows(demo.subjects));
    }
    seedDemoStudyStreak();
    router.replace("/today");
  }, [router, setProfile]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#131318] px-6 text-center text-white">
      <Loader2 className="h-8 w-8 animate-spin text-purple-500" aria-hidden />
      <p className="text-sm text-gray-400">Preparando demo de Kampus…</p>
    </div>
  );
}
