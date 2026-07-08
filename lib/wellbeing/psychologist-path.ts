export function buildPsychologistHref(opts?: {
  subject?: string;
  days?: number;
  prompt?: string;
}): string {
  const qs = new URLSearchParams();
  if (opts?.subject?.trim()) qs.set("subject", opts.subject.trim());
  if (opts?.days !== undefined && Number.isFinite(opts.days)) qs.set("days", String(Math.max(0, Math.floor(opts.days))));
  if (opts?.prompt?.trim()) qs.set("prompt", opts.prompt.trim());
  const q = qs.toString();
  return q ? `/wellbeing/psychologist?${q}` : "/wellbeing/psychologist";
}

export function buildExamStressPrompt(subject: string, days: number): string {
  if (days === 0) {
    return `Tengo el examen de ${subject} hoy y me siento muy nervioso/a. ¿Cómo puedo calmarme antes de entrar?`;
  }
  if (days === 1) {
    return `Mañana tengo el examen de ${subject} y no paro de rumiar. ¿Qué puedo hacer esta noche para descansar mejor?`;
  }
  return `En ${days} días tengo el examen de ${subject} y la ansiedad ya me está afectando. ¿Cómo puedo gestionarla sin quemarme?`;
}
