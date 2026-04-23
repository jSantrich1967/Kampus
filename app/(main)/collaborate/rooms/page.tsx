import type { Metadata } from "next";

import { StudyRoomPanel } from "@/components/collaborate/study-room-panel";

export const metadata: Metadata = { title: "Salas de estudio" };

export default function RoomsPage() {
  return <StudyRoomPanel />;
}
