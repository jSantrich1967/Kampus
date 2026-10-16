/**
 * Glosario corto de los "modos" de Kampus. Se usa como tooltip (title) en los
 * botones la primera vez que aparecen, para que la jerga no quede sin explicar.
 */
export function modeGlossaryTitle(href: string): string | undefined {
  if (href.includes("pass-mode")) {
    return "Modo aprobar: tu plan intensivo día por día para llegar listo al examen (plan Pro).";
  }
  if (href.includes("modo-examen")) {
    return "Modo examen: diagnóstico gratis de 2 minutos para detectar tus temas más flojos.";
  }
  if (href.includes("/tutor")) {
    return "Tutor IA: preguntas y respuestas socráticas sobre tu materia (3 gratis al día).";
  }
  return undefined;
}
