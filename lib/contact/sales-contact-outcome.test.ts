import { describe, expect, it } from "vitest";

import { salesContactOutcome } from "./sales-contact-outcome";

describe("salesContactOutcome", () => {
  it("does not thank the visitor when the email was not sent", () => {
    const result = salesContactOutcome(false, "María García", "maria@ejemplo.com");
    expect(result.status).toBe(503);
    expect(result.body.ok).toBe(false);
    if (!result.body.ok) {
      expect(result.body.error).toContain("No pudimos enviar");
    }
  });

  it("thanks the visitor only after the email is accepted", () => {
    const result = salesContactOutcome(true, "María García", "maria@ejemplo.com");
    expect(result.status).toBe(200);
    expect(result.body.ok).toBe(true);
    if (result.body.ok) {
      expect(result.body.message).toContain("María");
      expect(result.body.message).toContain("maria@ejemplo.com");
    }
  });
});
