"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const illustrationCache = new Map<string, { dataUrl: string }>();

function cacheKey(slideId: string, prompt: string) {
  return `${slideId}::${prompt}`;
}

export async function prefetchSlideIllustration(slideId: string, prompt: string, subjectHint: string) {
  const key = cacheKey(slideId, prompt.trim());
  if (illustrationCache.has(key)) return;
  try {
    const res = await fetch("/api/notebooks/class-presentation/illustration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim(), subjectHint }),
    });
    if (!res.ok) return;
    const json = (await res.json()) as { imageBase64?: string; mimeType?: string };
    if (!json.imageBase64) return;
    const dataUrl = `data:${json.mimeType ?? "image/png"};base64,${json.imageBase64}`;
    illustrationCache.set(key, { dataUrl });
  } catch {
    // ignore prefetch errors
  }
}

export function useSlideIllustration(slideId: string, prompt: string | undefined, subjectHint: string) {
  const requestRef = useRef(0);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (targetPrompt: string) => {
      const key = cacheKey(slideId, targetPrompt);
      const cached = illustrationCache.get(key);
      if (cached) {
        setDataUrl(cached.dataUrl);
        setError(null);
        setLoading(false);
        return;
      }

      const gen = ++requestRef.current;
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/notebooks/class-presentation/illustration", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: targetPrompt, subjectHint }),
        });
        const json = (await res.json()) as { imageBase64?: string; mimeType?: string; error?: string };
        if (!res.ok) throw new Error(json.error ?? "No se pudo generar la ilustración.");
        if (gen !== requestRef.current) return;
        if (!json.imageBase64) throw new Error("Imagen vacía.");
        const url = `data:${json.mimeType ?? "image/png"};base64,${json.imageBase64}`;
        illustrationCache.set(key, { dataUrl: url });
        setDataUrl(url);
      } catch (e) {
        if (gen !== requestRef.current) return;
        setDataUrl(null);
        setError(e instanceof Error ? e.message : "Error de ilustración.");
      } finally {
        if (gen === requestRef.current) setLoading(false);
      }
    },
    [slideId, subjectHint],
  );

  useEffect(() => {
    if (!prompt?.trim()) {
      setDataUrl(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load(prompt.trim());
  }, [load, prompt, slideId]);

  return { dataUrl, loading, error };
}
