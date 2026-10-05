/**
 * Envío de mensajes de WhatsApp vía Twilio.
 *
 * Variables requeridas:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_WHATSAPP_FROM (ej: whatsapp:+14155238886 o tu número aprobado)
 *
 * Nota: para mensajes proactivos (fuera de la ventana de 24h) Twilio exige
 * plantillas aprobadas. En producción usa una plantilla aprobada o el sandbox
 * con los destinatarios registrados.
 */

type SendResult = { ok: true; sid: string } | { ok: false; error: string };

function config() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_WHATSAPP_FROM?.trim();
  return { accountSid, authToken, from };
}

export function isWhatsAppConfigured(): boolean {
  const { accountSid, authToken, from } = config();
  return Boolean(accountSid && authToken && from);
}

/** Normaliza a formato whatsapp:+<E.164>. Acepta con o sin el prefijo whatsapp:. */
export function toWhatsAppAddress(phone: string): string {
  const digits = phone.trim().replace(/^whatsapp:/i, "");
  return `whatsapp:${digits.startsWith("+") ? digits : `+${digits}`}`;
}

export async function sendWhatsAppMessage(to: string, body: string): Promise<SendResult> {
  const { accountSid, authToken, from } = config();
  if (!accountSid || !authToken || !from) {
    return { ok: false, error: "twilio_not_configured" };
  }

  const toAddress = toWhatsAppAddress(to);
  const fromAddress = from.startsWith("whatsapp:") ? from : `whatsapp:${from}`;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromAddress,
          To: toAddress,
          Body: body,
        }).toString(),
      },
    );

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `twilio_${res.status}:${text.slice(0, 200)}` };
    }

    const json = (await res.json()) as { sid?: string };
    return { ok: true, sid: json.sid ?? "" };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "network_error" };
  }
}
