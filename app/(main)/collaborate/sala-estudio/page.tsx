import type { Metadata } from "next";

import { StudyRoomPanel } from "@/components/collaborate/study-room-panel";

export const metadata: Metadata = { title: "Sala de estudio" };

export default function StudyRoomPage() {
  return <StudyRoomPanel />;
}
