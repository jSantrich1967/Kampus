"use client";

import { subjectToPathSegment } from "@/lib/notebooks/paths";

export type SubjectCover = {
  /** Path inside `public/` (ex: `/notebook-covers/economy.webp`). */
  src: string;
  alt: string;
};

/**
 * Fixed catalog of cover backgrounds (small set, reused).
 * The mapping is intentionally simple: professional and predictable.
 */
export function getNotebookSubjectCover(subjectName: string): SubjectCover | null {
  const raw = subjectName?.trim() || "General";
  const s = subjectToPathSegment(raw);

  // Economics / business / econometrics
  if (/(econometr|estad|probab|data|analit|metric|regres)/.test(s)) {
    return { src: "/notebook-covers/data.webp", alt: "Portada de datos" };
  }
  if (/(econom|macro|micro|finanz|contab|admin|marketing|negoc|empresa|banca|mercado|bolsa|inversion)/.test(s)) {
    return { src: "/notebook-covers/economy.webp", alt: "Portada de economía" };
  }

  // Math
  if (/(calculo|algebra|geometr|matemat|trigonom|vector|ecuacion|integral|deriv)/.test(s)) {
    return { src: "/notebook-covers/math.webp", alt: "Portada de matemáticas" };
  }

  // Programming / computing
  if (/(program|codigo|software|comput|sistem|algorit|ia|machine|ml|ai|web|frontend|backend|node|react)/.test(s)) {
    return { src: "/notebook-covers/programming.webp", alt: "Portada de programación" };
  }

  // Science / health
  if (/(quimic|fisic|biolog|ciencia|laboratorio)/.test(s)) {
    return { src: "/notebook-covers/science.webp", alt: "Portada de ciencias" };
  }
  if (/(farmac|medic|salud|anatom|fisiolog|microbio)/.test(s)) {
    return { src: "/notebook-covers/health.webp", alt: "Portada de salud" };
  }

  // Law / humanities
  if (/(derecho|jurid|legal|constit|civil|penal|laboral)/.test(s)) {
    return { src: "/notebook-covers/law.webp", alt: "Portada de derecho" };
  }
  if (/(histori|geograf|cultura|internac|politic|sociolog|psicol|mente|neuro|cognit)/.test(s)) {
    return { src: "/notebook-covers/humanities.webp", alt: "Portada de humanidades" };
  }

  // Default: neutral cover (optional); for now we keep gradient-only.
  return null;
}

