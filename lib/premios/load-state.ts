export type PremiosLoadKind = "ready" | "signin" | "inactive" | "offline";

/** Turns the prizes response into the screen the student should see. */
export function premiosLoadKind(input: { status: number; configured?: boolean }): PremiosLoadKind {
  if (input.status === 401) return "signin";
  if (input.status === 0 || input.status >= 500) return "offline";
  if (input.status !== 200) return "offline";
  if (input.configured === false) return "inactive";
  return "ready";
}
