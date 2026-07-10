"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const illustrationCache = new Map<string, { dataUrl: string }>();
const inFlight = new Map<string, Promise<string | null>>();

const CLIENT_FETCH_TIMEOUT_MS = 90_000;

function cacheKey(slideId: string, prompt: string) {
  return `${slideId}::${prompt}`;
}

async function fetchIllustrationDataUrl(prompt: string, subjectHint: string): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CLIENT_FETCH_TIMEOUT_MS);

  try {
    const res = await fetch("/api/notebooks/class-presentation/illustration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.trim(), subjectHint }),
      signal: controller.signal,
    });
    const json = (await res.json()) as { imageBase64?: string; mimeType?: string; error?: string };
    if (!res.ok) throw new Error(json.error ?? "No se pudo generar la ilustración.");
    if (!json.imageBase64) throw new Error("Imagen vacía.");
    return `data:${json.mimeType ?? "image/png"};base64,${json.imageBase64}`;
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("La ilustración tardó demasiado. Pulsa Reintentar.");
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

function loadIllustration(slideId: string, prompt: string, subjectHint: string): Promise<string | null> {
  const trimmed = prompt.trim();
  const key = cacheKey(slideId, trimmed);
  const cached = illustrationCache.get(key);
  if (cached) return Promise.resolve(cached.dataUrl);

  const pending = inFlight.get(key);
  if (pending) return pending;

  const task = fetchIllustrationDataUrl(trimmed, subjectHint)
    .then((dataUrl) => {
      if (dataUrl) illustrationCache.set(key, { dataUrl });
      return dataUrl;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, task);
  return task;
}

export async function prefetchSlideIllustration(slideId: string, prompt: string, subjectHint: string) {
  try {
    await loadIllustration(slideId, prompt, subjectHint);
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
      const gen = ++requestRef.current;
      setLoading(true);
      setError(null);

      try {
        const url = await loadIllustration(slideId, targetPrompt, subjectHint);
        if (gen !== requestRef.current) return;
        if (!url) throw new Error("Imagen vacía.");
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

  const retry = useCallback(() => {
    if (!prompt?.trim()) return;
    void load(prompt.trim());
  }, [load, prompt]);

  useEffect(() => {
    if (!prompt?.trim()) {
      setDataUrl(null);
      setError(null);
      setLoading(false);
      return;
    }
    void load(prompt.trim());
  }, [load, prompt, slideId]);

  return { dataUrl, loading, error, retry };
}
