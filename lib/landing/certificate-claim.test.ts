import { describe, expect, it } from "vitest";

import { landingCertificateClaim } from "@/lib/landing/certificate-claim";

describe("landingCertificateClaim", () => {
  it("does not promise a verified certificate for finishing a goal", () => {
    const text = `${landingCertificateClaim.title} ${landingCertificateClaim.body}`;
    expect(text).toMatch(/declar/i);
    expect(text).toMatch(/escribiste tú/i);
    expect(text).not.toMatch(/verificable|código único de verificación|recibes certificados/i);
  });
});
