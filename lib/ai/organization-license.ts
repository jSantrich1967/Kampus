export type LicenseStatus = "active" | "expired" | "suspended";

export interface LicenseWindow {
  status: LicenseStatus;
  startsAt: string;
  endsAt: string | null;
}

/**
 * An institutional AI cap applies only while the contract is active
 * and this person holds a seat. Otherwise the personal plan stays.
 */
export function licenseCoversMember(input: {
  license: LicenseWindow | null;
  seatActive: boolean;
  now: Date;
}): boolean {
  if (!input.license || !input.seatActive) return false;
  if (input.license.status !== "active") return false;

  const start = Date.parse(input.license.startsAt);
  const now = input.now.getTime();
  if (!Number.isFinite(start) || now < start) return false;

  if (input.license.endsAt) {
    const end = Date.parse(input.license.endsAt);
    if (!Number.isFinite(end) || now >= end) return false;
  }

  return true;
}
