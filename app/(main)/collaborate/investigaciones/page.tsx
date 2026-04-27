import type { Metadata } from "next";

import { ResearchWorksHub } from "@/components/collaborate/research-works-hub";

export const metadata: Metadata = { title: "Mis investigaciones" };

export default function MisInvestigacionesPage() {
  return <ResearchWorksHub />;
}
