import type { SupabaseClient } from "@supabase/supabase-js";

export interface Certificate {
  id: string;
  code: string;
  ownerId: string | null;
  issuerId: string | null;
  ownerName: string;
  title: string;
  detail: string;
  issuedAt: string;
  /** True only when the database stamped an accredited teacher. The client cannot set this. */
  issuerAccredited: boolean;
  institutionName: string;
}

interface CertificateRow {
  id: string;
  code: string;
  owner_id: string | null;
  issuer_id: string | null;
  owner_name: string;
  title: string;
  detail: string;
  issued_at: string;
  issuer_accredited?: boolean | null;
  institution_name?: string | null;
}

export type CertificateKind = "self_declared" | "peer" | "institutional";

/** Institutional only when the database says this issuer is an accredited teacher. */
export function certificateKind(
  cert: Pick<Certificate, "ownerId" | "issuerId" | "issuerAccredited">,
): CertificateKind {
  const otherAccount = Boolean(cert.issuerId) && cert.issuerId !== cert.ownerId;
  if (otherAccount && cert.issuerAccredited) return "institutional";
  if (otherAccount) return "peer";
  return "self_declared";
}

export function certificatePublicCopy(
  kind: CertificateKind,
  institutionName = "",
): { title: string; body: string } {
  if (kind === "institutional") {
    const school = institutionName.trim();
    return {
      title: "Certificado institucional",
      body: school
        ? `Lo emitió un docente acreditado de ${school}. Kampus confirma esa acreditación, no el contenido del curso.`
        : "Lo emitió un docente acreditado. Kampus confirma esa acreditación, no el contenido del curso.",
    };
  }
  if (kind === "peer") {
    return {
      title: "Emitido por otra cuenta",
      body: "Otra cuenta de Kampus guardó este código. Esa cuenta no está acreditada como docente de una institución.",
    };
  }
  return {
    title: "Logro declarado",
    body: "La misma persona escribió este logro. El código existe en Kampus. Ningún docente lo acreditó.",
  };
}

/**
 * Same rule as the insert policies.
 * A caller may declare their own achievement with no issuer, or issue as themselves for someone else.
 * They may not store another account's id in issuer_id.
 */
export function certificateInsertAllowed(
  callerId: string,
  input: { ownerId?: string | null; issuerId?: string | null },
): boolean {
  const ownerId = input.ownerId ?? null;
  const issuerId = input.issuerId ?? null;
  const selfDeclared = ownerId === callerId && issuerId === null;
  const accreditedByCaller = issuerId === callerId && (ownerId === null || ownerId !== callerId);
  return selfDeclared || accreditedByCaller;
}

export type CertificateLookupStatus = "found" | "missing" | "unavailable";

/** A service failure is not the same as a code that does not exist. */
export function classifyCertificateLookup(
  outcome: { ok: true; certificate: Certificate | null } | { ok: false },
): CertificateLookupStatus {
  if (!outcome.ok) return "unavailable";
  return outcome.certificate ? "found" : "missing";
}

function toCertificate(row: CertificateRow): Certificate {
  return {
    id: row.id,
    code: row.code,
    ownerId: row.owner_id,
    issuerId: row.issuer_id,
    ownerName: row.owner_name,
    title: row.title,
    detail: row.detail,
    issuedAt: row.issued_at,
    issuerAccredited: row.issuer_accredited === true,
    institutionName: (row.institution_name ?? "").trim(),
  };
}

const CERTIFICATE_BASE_COLUMNS =
  "id, code, owner_id, issuer_id, owner_name, title, detail, issued_at";
const CERTIFICATE_COLUMNS = `${CERTIFICATE_BASE_COLUMNS}, issuer_accredited, institution_name`;

function missingAccreditationColumn(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const message = error.message ?? "";
  return error.code === "42703" || error.code === "PGRST204" || /issuer_accredited|institution_name/.test(message);
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(): string {
  let s = "";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += CODE_ALPHABET[b % CODE_ALPHABET.length];
  return `KMP-${s}`;
}

/** Emite un certificado con código único (reintenta si el código colisiona). */
export async function issueCertificate(
  client: SupabaseClient,
  input: {
    ownerId?: string | null;
    issuerId?: string | null;
    ownerName: string;
    title: string;
    detail?: string;
  },
): Promise<Certificate> {
  const { data: userData, error: userError } = await client.auth.getUser();
  const callerId = userData.user?.id ?? null;
  if (userError || !callerId) {
    throw new Error("Inicia sesión para guardar este código.");
  }
  if (!certificateInsertAllowed(callerId, input)) {
    throw new Error("No puedes atribuir la emisión a otra cuenta.");
  }

  let columns = CERTIFICATE_COLUMNS;
  let usedBaseColumns = false;
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = randomCode();
    const { data, error } = await client
      .from("certificates")
      .insert({
        code,
        owner_id: input.ownerId ?? null,
        issuer_id: input.issuerId ?? null,
        owner_name: input.ownerName.trim(),
        title: input.title.trim(),
        detail: (input.detail ?? "").trim(),
      })
      .select(columns)
      .single();
    if (!error) return toCertificate(data as unknown as CertificateRow);
    if (!usedBaseColumns && missingAccreditationColumn(error)) {
      usedBaseColumns = true;
      columns = CERTIFICATE_BASE_COLUMNS;
      continue;
    }
    lastError = error;
    // 23505 = unique violation (código repetido): reintentar con otro código.
    if ((error as { code?: string }).code !== "23505") throw error;
  }
  throw lastError instanceof Error ? lastError : new Error("No se pudo emitir el certificado.");
}

export async function listMyCertificates(
  client: SupabaseClient,
  userId: string,
): Promise<Certificate[]> {
  const full = await client
    .from("certificates")
    .select(CERTIFICATE_COLUMNS)
    .or(`owner_id.eq.${userId},issuer_id.eq.${userId}`)
    .order("issued_at", { ascending: false })
    .limit(50);
  if (!full.error) {
    return ((full.data ?? []) as unknown as CertificateRow[]).map(toCertificate);
  }
  if (!missingAccreditationColumn(full.error)) throw full.error;

  const fallback = await client
    .from("certificates")
    .select(CERTIFICATE_BASE_COLUMNS)
    .or(`owner_id.eq.${userId},issuer_id.eq.${userId}`)
    .order("issued_at", { ascending: false })
    .limit(50);
  if (fallback.error) throw fallback.error;
  return ((fallback.data ?? []) as unknown as CertificateRow[]).map(toCertificate);
}

export async function getCertificateByCode(
  client: SupabaseClient,
  code: string,
): Promise<Certificate | null> {
  const { data, error } = await client.rpc("get_certificate_by_code", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? toCertificate(row as CertificateRow) : null;
}

export async function mayIssueInstitutionCertificate(client: SupabaseClient): Promise<boolean> {
  const { data, error } = await client.rpc("caller_may_issue_institution_certificate");
  if (error) return false;
  return data === true;
}

export async function deleteCertificate(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("certificates").delete().eq("id", id);
  if (error) throw error;
}

/** URL pública de verificación (misma en cliente y servidor). */
export function certificateVerifyUrl(origin: string, code: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}/verificar/${encodeURIComponent(code)}`;
}

/** Mensaje listo para compartir por WhatsApp. */
export function certificateShareText(origin: string, cert: Certificate): string {
  const kind = certificateKind(cert);
  const intro =
    kind === "institutional"
      ? `Certificado institucional${cert.institutionName ? ` de ${cert.institutionName}` : ""}. Lo emitió un docente acreditado.`
      : kind === "peer"
        ? "Otra cuenta de Kampus emitió este reconocimiento. Esa cuenta no está acreditada como docente."
        : "Declaré este logro en Kampus. No es una acreditación de un docente.";
  return `${intro}\n${cert.title} — ${cert.ownerName}\nVer el código: ${certificateVerifyUrl(origin, cert.code)}`;
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
