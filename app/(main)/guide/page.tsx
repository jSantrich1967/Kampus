import type { Metadata } from "next";

import { AppGuideHub } from "@/components/guide/app-guide-hub";

export const metadata: Metadata = {
  title: "Guía de Kampus",
  description: "Qué hace cada sección de Kampus, sus objetivos y cómo ayuda al estudiante.",
};

export default function GuidePage() {
  return <AppGuideHub />;
}
