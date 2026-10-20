export type LocalRosterEntry = {
  id: string;
  name: string;
  perQuestion: number[];
  total: number;
};

function nextId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `roster-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Adds one graded student without replacing another who shares the same name.
 * The id is the identity; the name is only a label.
 */
export function appendLocalRosterEntry(
  roster: LocalRosterEntry[],
  entry: { name: string; perQuestion: number[]; total: number; id?: string },
): LocalRosterEntry[] {
  const id = entry.id?.trim() || nextId();
  return [...roster, { id, name: entry.name, perQuestion: entry.perQuestion, total: entry.total }];
}
