export type PaymentReviewFailure = {
  status: 403 | 404 | 409 | 500;
  error: string;
};

/** Maps a failed review_pro_payment call to an HTTP error. Never treats it as success. */
export function paymentReviewFailure(message: string): PaymentReviewFailure {
  const raw = message.toLowerCase();
  if (raw.includes("forbidden")) return { status: 403, error: "Sin permiso." };
  if (raw.includes("not_found")) return { status: 404, error: "Pago no encontrado." };
  if (raw.includes("already_processed")) return { status: 409, error: "Ese pago ya fue procesado." };
  return { status: 500, error: "No se pudo guardar la revisión del pago." };
}
