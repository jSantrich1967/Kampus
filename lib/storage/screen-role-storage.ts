import type { UserRole } from "@/lib/schemas/profile";

const ROLES: readonly UserRole[] = ["student", "teacher", "institution", "learner"];

let ownerId: string | null = null;

export function setScreenRoleOwner(userId: string | null) {
  ownerId = userId;
}

function resolveOwner(userId?: string | null): string | null {
  return userId === undefined ? ownerId : userId;
}

function screenRoleKey(userId: string | null): string {
  return userId ? `kampus.screenRole.v1.${userId}` : "kampus.screenRole.v1.anonymous";
}

function parseRole(value: string | null): UserRole | null {
  if (value && ROLES.includes(value as UserRole)) return value as UserRole;
  return null;
}

/** Role used only to pick screens on this computer. It is not an account permission. */
export function loadScreenRole(userId?: string | null): UserRole | null {
  if (typeof window === "undefined") return null;
  return parseRole(window.localStorage.getItem(screenRoleKey(resolveOwner(userId))));
}

export function saveScreenRole(role: UserRole, userId?: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(screenRoleKey(resolveOwner(userId)), role);
}

export function clearScreenRole(userId: string | null): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(screenRoleKey(userId));
}

export function applyScreenRole<T extends { role: UserRole }>(profile: T, userId: string | null): T {
  const screen = loadScreenRole(userId);
  if (!screen || screen === profile.role) return profile;
  return { ...profile, role: screen };
}
