import { createHmac, timingSafeEqual } from "node:crypto";

import {
  canonicalCounselorPayloadJson,
  type CounselorSignPayload,
} from "@/lib/wellbeing/counselor-sign-shared";

export type { CounselorSignPayload } from "@/lib/wellbeing/counselor-sign-shared";
export { counselorPayloadFromShare, appendCounselorSignatureBlock } from "@/lib/wellbeing/counselor-sign-shared";

function getSigningSecret(): string | null {
  const secret = process.env.WELLBEING_COUNSELOR_SIGNING_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

export function signCounselorPayload(payload: CounselorSignPayload): { signature: string; signedAt: string } | null {
  const secret = getSigningSecret();
  if (!secret) return null;
  const signedAt = new Date().toISOString();
  const body = `${signedAt}\n${canonicalCounselorPayloadJson(payload)}`;
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  return { signature, signedAt };
}

export function verifyCounselorSignature(
  payload: CounselorSignPayload,
  signature: string,
  signedAt: string,
): boolean {
  const secret = getSigningSecret();
  if (!secret || !signature || !signedAt) return false;
  const expected = createHmac("sha256", secret).update(`${signedAt}\n${canonicalCounselorPayloadJson(payload)}`).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.trim(), "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function parseCounselorSignatureBlock(text: string): {
  payload: CounselorSignPayload;
  signature: string;
  signedAt: string;
} | null {
  const signedAtMatch = text.match(/^Generado:\s*(.+)$/m);
  const payloadMatch = text.match(/^Payload:\s*(.+)$/m);
  const signatureMatch = text.match(/^Firma:\s*([a-f0-9]+)$/im);
  if (!signedAtMatch || !payloadMatch || !signatureMatch) return null;

  try {
    const json = Buffer.from(payloadMatch[1]!.trim(), "base64url").toString("utf8");
    const payload = JSON.parse(json) as CounselorSignPayload;
    if (payload.v !== 1) return null;
    return {
      payload,
      signature: signatureMatch[1]!.trim(),
      signedAt: signedAtMatch[1]!.trim(),
    };
  } catch {
    return null;
  }
}
