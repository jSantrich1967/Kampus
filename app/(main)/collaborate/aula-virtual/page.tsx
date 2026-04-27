import type { Metadata } from "next";

import { VirtualClassroomHub } from "@/components/collaborate/virtual-classroom-hub";

export const metadata: Metadata = { title: "Aula virtual" };

export default function AulaVirtualPage() {
  return <VirtualClassroomHub />;
}
