import type { Metadata } from "next";

import { ReviewSessionPage } from "@/components/reviews/review-session-page";

export const metadata: Metadata = {
  title: "Repasos",
};

export default function RepasosPage() {
  return <ReviewSessionPage />;
}
