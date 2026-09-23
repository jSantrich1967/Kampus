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
  };
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
      .select("id, code, owner_id, issuer_id, owner_name, title, detail, issued_at")
      .single();
    if (!error) return toCertificate(data as CertificateRow);
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
  const { data, error } = await client
    .from("certificates")
    .select("id, code, owner_id, issuer_id, owner_name, title, detail, issued_at")
    .or(`owner_id.eq.${userId},issuer_id.eq.${userId}`)
    .order("issued_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return ((data ?? []) as CertificateRow[]).map(toCertificate);
}

export async function getCertificateByCode(
  client: SupabaseClient,
  code: string,
): Promise<Certificate | null> {
  const { data, error } = await client
    .from("certificates")
    .select("id, code, owner_id, issuer_id, owner_name, title, detail, issued_at")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data ? toCertificate(data as CertificateRow) : null;
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
  return (
    `🎓 ¡Obtuve mi certificado en Kampus!\n` +
    `${cert.title} — ${cert.ownerName}\n` +
    `Verifícalo aquí: ${certificateVerifyUrl(origin, cert.code)}`
  );
}

export function whatsappShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
