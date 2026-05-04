import type { Metadata } from "next";

import { PsychologistHub } from "@/components/wellbeing/psychologist-hub";

export const metadata: Metadata = { title: "Psicólogo" };

export default function PsychologistPage() {
  return <PsychologistHub />;
}
