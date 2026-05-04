import type { Metadata } from "next";

import { DiaryHub } from "@/components/wellbeing/diary-hub";

export const metadata: Metadata = { title: "Mi Diario" };

export default function DiaryPage() {
  return <DiaryHub />;
}
