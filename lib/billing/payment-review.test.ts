import { describe, expect, it } from "vitest";

import { paymentReviewFailure } from "@/lib/billing/payment-review";

describe("paymentReviewFailure", () => {
  it("does not turn a failed grant into success", () => {
    expect(paymentReviewFailure("write_failed").status).toBe(500);
    expect(paymentReviewFailure("permission denied for table billing_entitlements").status).toBe(500);
  });

  it("keeps already processed and missing payments distinct", () => {
    expect(paymentReviewFailure("already_processed").status).toBe(409);
    expect(paymentReviewFailure("not_found").status).toBe(404);
    expect(paymentReviewFailure("forbidden").status).toBe(403);
  });
});
