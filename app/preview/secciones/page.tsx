import type { Metadata } from "next";

import { LandingSectionsViewer } from "@/components/landing/landing-sections-viewer";

export const metadata: Metadata = {
  title: "Visor de secciones",
  robots: { index: false, follow: false },
};

export default function PreviewSectionsPage() {
  return <LandingSectionsViewer />;
}
