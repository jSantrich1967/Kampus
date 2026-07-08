/** Suggested min/max minutes for a visual timer (no auto-submit). */
export function parseSuggestedTimerRange(description: string, questionCount: number): { min: number; max: number } {
  const range = description.match(/(\d+)\s*[–-]\s*(\d+)\s*min/i);
  if (range) {
    return { min: parseInt(range[1]!, 10), max: parseInt(range[2]!, 10) };
  }
  const single = description.match(/(\d+)\s*min/i);
  if (single) {
    const n = parseInt(single[1]!, 10);
    return { min: n, max: n };
  }
  const low = Math.max(5, questionCount * 5);
  const high = questionCount * 10;
  return { min: low, max: high };
}

export function formatTimerClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function timerProgressPct(elapsedSeconds: number, maxMinutes: number): number {
  if (maxMinutes <= 0) return 0;
  return Math.min(100, Math.round((elapsedSeconds / (maxMinutes * 60)) * 100));
}
