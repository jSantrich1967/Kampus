"use client";

import type { LucideIcon } from "lucide-react";
import {
  Atom,
  BookText,
  Brain,
  Calculator,
  ChartLine,
  Code,
  FlaskConical,
  Globe,
  Landmark,
  Scale,
} from "lucide-react";

import { subjectToPathSegment } from "@/lib/notebooks/paths";

type SubjectIconResult = {
  Icon: LucideIcon;
  /** Short label for tooltip / aria. */
  label: string;
};

/**
 * Picks an icon based on subject name.
 * - We match on a normalized "slug" so accents/case don't matter.
 * - The goal is "looks professional" without requiring the user to upload images.
 */
export function getNotebookSubjectIcon(subjectName: string): SubjectIconResult {
  const raw = subjectName?.trim() || "General";
  const s = subjectToPathSegment(raw);

  // --- Economics / business
  if (/(econom|macro|micro|finanz|contab|admin|marketing|negoc|empresa)/.test(s)) {
    return { Icon: ChartLine, label: "Economía / negocios" };
  }
  if (/(econometr|estad|probab|data|analit|metric|regres)/.test(s)) {
    return { Icon: ChartLine, label: "Econometría / datos" };
  }
  if (/(banca|mercado|bolsa|inversion)/.test(s)) {
    return { Icon: Landmark, label: "Finanzas" };
  }

  // --- Math / engineering
  if (/(calculo|algebra|geometr|matemat|trigonom|vector|ecuacion|integral|deriv)/.test(s)) {
    return { Icon: Calculator, label: "Matemáticas" };
  }

  // --- Computing
  if (/(program|codigo|software|comput|sistem|algorit|ia|machine|ml|ai|web|frontend|backend|node|react)/.test(s)) {
    return { Icon: Code, label: "Programación" };
  }

  // --- Science
  if (/(quimic|fisic|biolog|ciencia|laboratorio)/.test(s)) {
    return { Icon: Atom, label: "Ciencias" };
  }
  if (/(farmac|medic|salud|anatom|fisiolog|microbio)/.test(s)) {
    return { Icon: FlaskConical, label: "Salud / laboratorio" };
  }

  // --- Humanities / law / social
  if (/(derecho|jurid|legal|constit|civil|penal|laboral)/.test(s)) {
    return { Icon: Scale, label: "Derecho" };
  }
  if (/(histori|geograf|cultura|internac|politic|sociolog)/.test(s)) {
    return { Icon: Globe, label: "Humanidades / sociales" };
  }
  if (/(psicol|mente|neuro|cognit)/.test(s)) {
    return { Icon: Brain, label: "Psicología" };
  }

  // Default: generic "notes/book"
  return { Icon: BookText, label: "Cuaderno" };
}

