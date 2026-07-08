/** Disparar tras guardar o borrar entradas del diario (badges sidebar, panel Hoy). */
export const DIARY_CHANGED_EVENT = "kampus:diary-changed";

export const DIARY_SYNC_COMPLETED_EVENT = "kampus:diary-sync-completed";

export type DiarySyncCompletedDetail = { pushedCount: number; flushedPending?: number };

export function notifyDiaryChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(DIARY_CHANGED_EVENT));
}

export function notifyDiarySyncCompleted(detail: DiarySyncCompletedDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(DIARY_SYNC_COMPLETED_EVENT, { detail }));
}
