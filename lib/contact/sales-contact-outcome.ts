import { KAMPUS_SALES_EMAIL } from "@/lib/schemas/sales-contact";

export type SalesContactOutcome = {
  status: number;
  body: { ok: false; error: string } | { ok: true; message: string; salesEmail: string };
};

/** Success only when the email was accepted. A saved row is not the same as a sent message. */
export function salesContactOutcome(emailed: boolean, name: string, email: string): SalesContactOutcome {
  if (!emailed) {
    return {
      status: 503,
      body: {
        ok: false,
        error: `No pudimos enviar tu solicitud. Escríbenos directamente a ${KAMPUS_SALES_EMAIL}.`,
      },
    };
  }

  const firstName = name.trim().split(/\s+/)[0] || name.trim();
  return {
    status: 200,
    body: {
      ok: true,
      message: `Gracias, ${firstName}. Te escribiremos pronto a ${email}.`,
      salesEmail: KAMPUS_SALES_EMAIL,
    },
  };
}
