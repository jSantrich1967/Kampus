import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  certificateInsertAllowed,
  certificateKind,
  certificatePublicCopy,
  certificateShareText,
  classifyCertificateLookup,
  type Certificate,
} from "@/lib/supabase/certificates-db";

const STUDENT = "11111111-1111-1111-1111-111111111111";
const TEACHER = "22222222-2222-2222-2222-222222222222";

function cert(
  partial: Pick<Certificate, "ownerId" | "issuerId"> &
    Partial<Certificate>,
): Certificate {
  return {
    id: "id",
    code: "KMP-TESTCODE",
    ownerName: "Alex",
    title: "Cálculo",
    detail: "",
    issuedAt: "2026-09-28T00:00:00.000Z",
    issuerAccredited: false,
    institutionName: "",
    ...partial,
  };
}

describe("certificate trust", () => {
  it("does not label a self-declared achievement as an accredited certificate", () => {
    const declared = cert({ ownerId: STUDENT, issuerId: null });
    expect(certificateKind(declared)).toBe("self_declared");
    expect(certificatePublicCopy("self_declared").title).toBe("Logro declarado");
    expect(certificatePublicCopy("self_declared").title).not.toMatch(/verificado/i);
    expect(certificateShareText("https://kampus.test", declared)).not.toMatch(/verificado|obtuve mi certificado/i);
  });

  it("treats another account as peer until the database accredits that teacher", () => {
    const peer = cert({ ownerId: STUDENT, issuerId: TEACHER, issuerAccredited: false });
    expect(certificateKind(peer)).toBe("peer");
    expect(certificatePublicCopy("peer").title).toBe("Emitido por otra cuenta");
    expect(certificatePublicCopy("peer").body).toMatch(/no está acreditada/i);
    expect(certificateKind(cert({ ownerId: STUDENT, issuerId: STUDENT, issuerAccredited: true }))).toBe(
      "self_declared",
    );
  });

  it("calls a certificate institutional only when the issuer is accredited", () => {
    const institutional = cert({
      ownerId: null,
      issuerId: TEACHER,
      issuerAccredited: true,
      institutionName: "Universidad Demo",
    });
    expect(certificateKind(institutional)).toBe("institutional");
    const copy = certificatePublicCopy("institutional", institutional.institutionName);
    expect(copy.title).toBe("Certificado institucional");
    expect(copy.body).toMatch(/Universidad Demo/);
    expect(copy.body).not.toMatch(/verificado/i);
    expect(certificateShareText("https://kampus.test", institutional)).toMatch(/institucional/i);
  });

  it("rejects attributing the issuer to another account", () => {
    expect(certificateInsertAllowed(STUDENT, { ownerId: STUDENT, issuerId: null })).toBe(true);
    expect(certificateInsertAllowed(TEACHER, { ownerId: null, issuerId: TEACHER })).toBe(true);
    expect(certificateInsertAllowed(TEACHER, { ownerId: STUDENT, issuerId: TEACHER })).toBe(true);
    expect(certificateInsertAllowed(STUDENT, { ownerId: STUDENT, issuerId: TEACHER })).toBe(false);
    expect(certificateInsertAllowed(STUDENT, { ownerId: null, issuerId: TEACHER })).toBe(false);
    expect(certificateInsertAllowed(STUDENT, { ownerId: STUDENT, issuerId: STUDENT })).toBe(false);
  });

  it("keeps a service failure distinct from a missing code", () => {
    expect(classifyCertificateLookup({ ok: false })).toBe("unavailable");
    expect(classifyCertificateLookup({ ok: true, certificate: null })).toBe("missing");
    expect(
      classifyCertificateLookup({
        ok: true,
        certificate: cert({ ownerId: STUDENT, issuerId: null }),
      }),
    ).toBe("found");
  });

  it("keeps institutional accreditation in a service-role table the client cannot write", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260928183000_institution_certificate_issuers.sql"),
      "utf8",
    );
    expect(sql).toMatch(/institution_certificate_issuers/);
    expect(sql).toMatch(/new\.issuer_accredited := false/);
    expect(sql).toMatch(/revoke all on public\.institution_certificate_issuers from authenticated/);
    expect(sql).toMatch(/issuer_accredited boolean/);
  });

  it("drops the insert policy that let the owner choose any issuer", () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), "supabase/migrations/20260928170000_separate_certificate_issuer.sql"),
      "utf8",
    );
    expect(sql).toMatch(/drop policy if exists "certificates_owner_insert"/);
    expect(sql).toMatch(/issuer_id is null/);
    expect(sql).toMatch(/auth\.uid\(\) = issuer_id/);
    expect(sql).not.toMatch(/auth\.uid\(\) = owner_id or auth\.uid\(\) = issuer_id/);
  });
});
