import type { Metadata } from "next";

import { PresentationPlanner } from "@/components/collaborate/presentation-planner";

export const metadata: Metadata = { title: "Mis exposiciones" };

export default function MisExposicionesPage() {
  return <PresentationPlanner />;
}
