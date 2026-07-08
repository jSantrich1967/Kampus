import type { StudyRoomState } from "@/lib/storage/study-room-storage";

export function buildStudyRoomAssistantContext(state: StudyRoomState, roomCode: string): string {
  const agenda = state.agenda.length > 0 ? state.agenda.map((item, i) => `${i + 1}. ${item}`).join("\n") : "(sin agenda)";
  const notes = state.notes.trim() || "(sin notas aún)";

  return [
    `Sala: ${state.title.trim() || "Sin título"} (código ${roomCode})`,
    `Meta compartida: ${state.sharedGoal.trim() || "(sin meta definida)"}`,
    `Agenda:\n${agenda}`,
    `Notas del equipo:\n${notes}`,
    `Tiempo de enfoque acumulado: ${Math.floor(state.focusSeconds / 60)} min`,
  ].join("\n\n");
}
