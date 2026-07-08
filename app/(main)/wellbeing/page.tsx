import type { Metadata } from "next";

import { WellbeingHub } from "@/components/wellbeing/wellbeing-hub";

export const metadata: Metadata = { title: "Bienestar" };

export default function WellbeingPage() {
  return <WellbeingHub />;
}
