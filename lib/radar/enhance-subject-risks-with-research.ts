import type { SubjectRisk, RiskLevel } from "@/lib/pass-mode";
import { isStudentWorkCompleted, type StudentWork } from "@/lib/schemas/student-work";

function daysUntilDue(dueIso: string, now = new Date()): number | null {
  const d = dueIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const [y, m, day] = d.split("-").map(Number);
  const due = new Date(y!, m! - 1, day!);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

function subjectsMatch(a: string, b: string): boolean {
  const x = a.trim().toLowerCase();
  const y = b.trim().toLowerCase();
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function scoreToRisk(score: number): RiskLevel {
  if (score >= 70) return "high";
  if (score >= 45) return "medium";
  return "low";
}

/** Adds Mis investigaciones deadlines into per-subject radar scores. */
export function enhanceSubjectRisksWithResearch(risks: SubjectRisk[], works: StudentWork[]): SubjectRisk[] {
  const pending = works.filter((w) => !isStudentWorkCompleted(w));
  if (pending.length === 0) return risks;

  return risks.map((risk) => {
    const subjectWorks = pending.filter((w) => subjectsMatch(w.subject, risk.subject));
    if (subjectWorks.length === 0) return risk;

    let boost = 0;
    const extraReasons: string[] = [];

    for (const w of subjectWorks) {
      const diff = daysUntilDue(w.dueDate);
      if (diff !== null && diff < 0) {
        boost += 25;
        extraReasons.push(`Entrega vencida en investigaciones: «${w.title}».`);
      } else if (diff !== null && diff <= 3) {
        boost += 18;
        extraReasons.push(
          diff === 0
            ? `Entrega hoy en investigaciones: «${w.title}».`
            : `Entrega en ${diff} día(s): «${w.title}».`,
        );
      } else if (diff !== null && diff <= 7) {
        boost += 10;
        extraReasons.push(`Trabajo pendiente esta semana: «${w.title}».`);
      }
    }

    const score = Math.min(100, risk.score + boost);
    const mergedReasons = [...risk.reasons, ...extraReasons.slice(0, 2)];

    const nextAction =
      boost >= 18
        ? "Abre Mis investigaciones, cierra la entrega más urgente y vuelve al repaso de examen."
        : risk.nextAction;

    return {
      ...risk,
      risk: scoreToRisk(score),
      score,
      reasons: mergedReasons,
      nextAction,
    };
  });
}

export function countPendingResearchWorks(works: StudentWork[]): number {
  return works.filter((w) => !isStudentWorkCompleted(w)).length;
}
