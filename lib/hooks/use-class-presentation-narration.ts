"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type SpeakOptions = {
  onEnd?: () => void;
};

function speakWithBrowser(text: string, onEnd?: () => void): (() => void) | void {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "es-ES";
  utterance.rate = 0.9;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return () => window.speechSynthesis.cancel();
}

export function useClassPresentationNarration() {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceMode, setVoiceMode] = useState<"openai" | "browser" | "none">("openai");

  const cacheRef = useRef<Map<string, string>>(new Map());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const generationRef = useRef(0);
  const browserCancelRef = useRef<(() => void) | void>(undefined);

  const stop = useCallback(() => {
    generationRef.current += 1;
    browserCancelRef.current?.();
    browserCancelRef.current = undefined;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
    setLoading(false);
  }, []);

  const prefetch = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || cacheRef.current.has(trimmed)) return;
    try {
      const res = await fetch("/api/notebooks/class-presentation/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      cacheRef.current.set(trimmed, url);
    } catch {
      // ignore prefetch errors
    }
  }, []);

  const speak = useCallback(
    async (text: string, options?: SpeakOptions) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      stop();
      const gen = generationRef.current;
      setLoading(true);

      let blobUrl = cacheRef.current.get(trimmed);
      if (!blobUrl) {
        try {
          const res = await fetch("/api/notebooks/class-presentation/speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: trimmed }),
          });
          if (!res.ok) throw new Error("tts unavailable");
          const blob = await res.blob();
          blobUrl = URL.createObjectURL(blob);
          cacheRef.current.set(trimmed, blobUrl);
          setVoiceMode("openai");
        } catch {
          if (gen !== generationRef.current) return;
          setLoading(false);
          setSpeaking(true);
          setVoiceMode("browser");
          browserCancelRef.current = speakWithBrowser(trimmed, () => {
            setSpeaking(false);
            options?.onEnd?.();
          });
          return;
        }
      }

      if (gen !== generationRef.current) return;

      const audio = new Audio(blobUrl);
      audioRef.current = audio;
      audio.onended = () => {
        if (generationRef.current !== gen) return;
        setSpeaking(false);
        audioRef.current = null;
        options?.onEnd?.();
      };
      audio.onerror = () => {
        if (generationRef.current !== gen) return;
        setSpeaking(false);
        setVoiceMode("browser");
        browserCancelRef.current = speakWithBrowser(trimmed, () => {
          setSpeaking(false);
          options?.onEnd?.();
        });
      };

      setLoading(false);
      setSpeaking(true);
      try {
        await audio.play();
      } catch {
        if (generationRef.current !== gen) return;
        setSpeaking(false);
        setVoiceMode("browser");
        browserCancelRef.current = speakWithBrowser(trimmed, () => {
          setSpeaking(false);
          options?.onEnd?.();
        });
      }
    },
    [stop],
  );

  useEffect(() => {
    const cache = cacheRef.current;
    return () => {
      stop();
      cache.forEach((url) => URL.revokeObjectURL(url));
      cache.clear();
    };
  }, [stop]);

  return { speak, stop, prefetch, speaking, loading, voiceMode };
}
