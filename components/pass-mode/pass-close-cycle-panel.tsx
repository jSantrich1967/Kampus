"use client";

import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { passModeCopy } from "@/lib/i18n/pass-mode";
import {
  isPassCloseCycleFilled,
  loadPassCloseCycle,
  savePassCloseCycle,
  type PassCloseCycleState,
} from "@/lib/storage/pass-close-cycle-storage";

type PassCloseCyclePanelProps = {
  onComplete?: () => void;
};

export function PassCloseCyclePanel({ onComplete }: PassCloseCyclePanelProps) {
  const t = passModeCopy.es;
  const [state, setState] = useState<PassCloseCycleState>(() => loadPassCloseCycle());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setState(loadPassCloseCycle());
  }, []);

  const updateError = useCallback((index: number, value: string) => {
    setState((prev) => {
      const errors = [...prev.errors] as [string, string, string];
      errors[index] = value;
      return { ...prev, errors };
    });
    setSaved(false);
  }, []);

  const updateQuestion = useCallback((value: string) => {
    setState((prev) => ({ ...prev, classQuestion: value }));
    setSaved(false);
  }, []);

  function handleSave() {
    savePassCloseCycle(state);
    setSaved(true);
  }

  function handleComplete() {
    savePassCloseCycle(state);
    setSaved(true);
    onComplete?.();
  }

  const canComplete = isPassCloseCycleFilled(state);

  return (
    <Card id="close-cycle" className="scroll-mt-24 border-indigo-500/25">
      <CardHeader>
        <CardTitle>{t.closeTitle}</CardTitle>
        <CardDescription>{t.closeHint}</CardDescription>
      </CardHeader>
      <div className="space-y-4 px-6 pb-6">
        {[0, 1, 2].map((i) => (
          <label key={i} className="block space-y-1.5 text-sm">
            <span className="text-slate-300">{t.closeErrorLabel(i + 1)}</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-500/80"
              value={state.errors[i]}
              onChange={(e) => updateError(i, e.target.value)}
              placeholder="Ej. Confundí derivada implícita con regla de la cadena"
            />
          </label>
        ))}
        <label className="block space-y-1.5 text-sm">
          <span className="text-slate-300">{t.closeQuestionLabel}</span>
          <input
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:ring-2 focus:ring-purple-500/80"
            value={state.classQuestion}
            onChange={(e) => updateQuestion(e.target.value)}
            placeholder="Ej. ¿Cómo se aplica esto en el ejercicio tipo examen?"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={handleSave}>
            {saved ? t.closeSaved : t.closeSave}
          </Button>
          <Button type="button" disabled={!canComplete} onClick={handleComplete}>
            {t.closeComplete}
          </Button>
        </div>
      </div>
    </Card>
  );
}
