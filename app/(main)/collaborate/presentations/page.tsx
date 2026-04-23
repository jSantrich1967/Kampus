import type { Metadata } from "next";

import { PresentationPlanner } from "@/components/collaborate/presentation-planner";

export const metadata: Metadata = { title: "Exposición grupal" };

export default function PresentationsPage() {
  return <PresentationPlanner />;
}
