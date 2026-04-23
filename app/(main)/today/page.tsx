import type { Metadata } from "next";

import { TodayDashboard } from "@/components/today/today-dashboard";

export const metadata: Metadata = {
  title: "Hoy",
};

export default function TodayPage() {
  return <TodayDashboard />;
}
