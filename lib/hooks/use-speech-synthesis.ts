"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeakOptions = {
  lang?: string;
  rate?: number;
  onEnd?: () => void;
};

export function useSpeechSynthesis() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const supported = typeof window !== "undefined" && "speechSynthesis" in window;

  const cancel = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
    utteranceRef.current = null;
  }, [supported]);

  const speak = useCallback(
    (text: string, options?: SpeakOptions) => {
      if (!supported || !text.trim()) return;
      cancel();
      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = options?.lang ?? "es-ES";
      utterance.rate = options?.rate ?? 0.92;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => {
        setSpeaking(false);
        utteranceRef.current = null;
        options?.onEnd?.();
      };
      utterance.onerror = () => {
        setSpeaking(false);
        utteranceRef.current = null;
      };
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [cancel, supported],
  );

  useEffect(() => () => cancel(), [cancel]);

  return { speak, cancel, speaking, supported };
}
