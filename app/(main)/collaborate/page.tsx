import type { Metadata } from "next";

import { CollaborateHub } from "@/components/collaborate/collaborate-hub";

export const metadata: Metadata = { title: "Colaboración" };

export default function CollaboratePage() {
  return <CollaborateHub />;
}
