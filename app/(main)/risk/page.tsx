import type { Metadata } from "next";

import { AcademicRiskRadar } from "@/components/risk/academic-risk-radar";

export const metadata: Metadata = {
  title: "Radar académico",
};

export default function RiskPage() {
  return <AcademicRiskRadar />;
}
