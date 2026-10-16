import { Suspense } from "react";

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-400">Cargando…</div>}>
      <OnboardingFlow />
    </Suspense>
  );
}
