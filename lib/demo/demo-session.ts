/**
 * Marca de sesión demo en este navegador. La demo no usa cuenta real:
 * todo vive en las cajas locales del navegador y se puede abandonar
 * sin dejar datos en el servidor.
 */
const DEMO_FLAG_KEY = "kampus.demoMode";
export const DEMO_COOKIE = "kampus_demo";

export function markDemoBrowser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_FLAG_KEY, "1");
  } catch {
    /* almacenamiento no disponible */
  }
  try {
    document.cookie = `${DEMO_COOKIE}=1; path=/; max-age=86400; SameSite=Lax`;
  } catch {
    /* cookies no disponibles */
  }
}

export function clearDemoBrowser() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEMO_FLAG_KEY);
  } catch {
    /* almacenamiento no disponible */
  }
  try {
    document.cookie = `${DEMO_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
  } catch {
    /* cookies no disponibles */
  }
}

export function isDemoBrowser(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(DEMO_FLAG_KEY) === "1") return true;
  } catch {
    /* almacenamiento no disponible */
  }
  try {
    return document.cookie.split("; ").some((c) => c === `${DEMO_COOKIE}=1`);
  } catch {
    return false;
  }
}

const GUIDE_VISITED_KEY = "kampus.demoGuide.visited";
const GUIDE_DISMISSED_KEY = "kampus.demoGuide.dismissed";

export function loadDemoGuideVisited(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUIDE_VISITED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function markDemoGuideVisited(stepId: string) {
  if (typeof window === "undefined") return;
  try {
    const visited = new Set(loadDemoGuideVisited());
    visited.add(stepId);
    window.localStorage.setItem(GUIDE_VISITED_KEY, JSON.stringify([...visited]));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function isDemoGuideDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GUIDE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissDemoGuide() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUIDE_DISMISSED_KEY, "1");
  } catch {
    /* almacenamiento no disponible */
  }
}
