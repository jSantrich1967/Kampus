import type { UserRole } from "@/lib/schemas/profile";

/** Visual shell: student-like vs staff dashboards. */
export type ShellTheme = "student" | "faculty" | "institution";

export function shellThemeFromRole(role: UserRole): ShellTheme {
  if (role === "teacher") return "faculty";
  if (role === "institution") return "institution";
  return "student";
}
