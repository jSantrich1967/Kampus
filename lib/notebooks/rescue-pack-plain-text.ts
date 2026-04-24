import type { RescuePack } from "@/lib/class-rescue";

/**
 * Block prepended to `notes` when calling `/api/rescue/pack` so the model can align the kit with cuaderno tags.
 */
export function buildRescueTagNotesSection(
  subjectHint: string,
  topic: string,
  lessonPoint: string,
  practiceExercises: string,
): string {
  const lines: string[] = ["--- Etiquetas del rescate (misma clasificación que en Mis cuadernos) ---"];
  lines.push(`Materia: ${subjectHint.trim() || "General"}`);
  lines.push(`Tema: ${topic.trim() || "(no indicado)"}`);
  lines.push(`Punto: ${lessonPoint.trim() || "(no indicado)"}`);
  lines.push(`Ejercicios prácticos: ${practiceExercises.trim() || "(no indicado)"}`);
  return lines.join("\n");
}

/** Plain-text export of a generated kit (stored as .txt in Storage + extracted_text). */
export function serializeRescuePackToPlainText(pack: RescuePack): string {
  const blocks: string[] = [];
  blocks.push(`KIT DE RESCATE DE CLASE\n${pack.subjectLine}\n`);
  blocks.push(`## Resumen rápido\n${pack.quickSummary}`);
  blocks.push(`## Ideas clave\n${pack.keyIdeas.join("\n")}`);
  blocks.push(`## Resumen completo\n${pack.fullSummary}`);
  blocks.push(`## Explicación profunda\n${pack.deepExplanation}`);
  blocks.push(`## Probables preguntas de examen\n${pack.probableExamQuestions.join("\n")}`);
  blocks.push(
    `## Tarjetas\n${pack.flashcards.map((c) => `F: ${c.front}\nR: ${c.back}`).join("\n\n")}`,
  );
  blocks.push(
    `## Quiz\n${pack.quiz
      .map(
        (q, i) =>
          `${i + 1}. ${q.question}\n${q.options.map((o, j) => `   ${String.fromCharCode(65 + j)}. ${o}${j === q.answerIndex ? " ✓" : ""}`).join("\n")}`,
      )
      .join("\n\n")}`,
  );
  blocks.push(`## Checklist de estudio\n${pack.studyChecklist.join("\n")}`);
  blocks.push(`## Mapa mental (outline)\n${pack.mindMapOutline}`);
  blocks.push(`## Explicación fácil\n${pack.easyExplanation}`);
  blocks.push(`## Explicación técnica\n${pack.technicalExplanation}`);
  blocks.push(`## Preguntas para clase\n${pack.questionsForClass.join("\n")}`);
  blocks.push(`## Siguiente recurso sugerido\n${pack.suggestedNextResource}`);
  return blocks.join("\n\n---\n\n");
}
