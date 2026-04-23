import type { Metadata } from "next";

import { InstitutionConsole } from "@/components/institution/institution-console";

export const metadata: Metadata = { title: "Institución" };

export default function InstitutionPage() {
  return <InstitutionConsole />;
}
