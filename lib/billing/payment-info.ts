/**
 * Datos para cobrar el plan Pro (cobro manual).
 *
 * Para activar el cobro real, reemplaza los valores `configured: false` y
 * los datos de ejemplo por los datos verdaderos de cobro y pon
 * `configured: true`. Mientras `configured` sea false, la página /pro no
 * acepta reportes de pago y avisa que estamos activando el cobro.
 */
export const PRO_PRICE_USD = 5;

export const PAYMENT_INFO = {
  configured: true,
  pagoMovil: {
    bank: "Banco Mercantil",
    phone: "0424-6509405",
    idNumber: "9.722.930",
    holder: "Joreg",
  },
  zelle: {
    email: "jsantrichu67@gmail.com",
    holder: "Joreg",
  },
  binance: {
    note: "Envía USDT a nuestro correo de Binance Pay (te lo confirmamos al reportar).",
  },
} as const;

export type PaymentMethod = "pago_movil" | "zelle" | "binance" | "otro";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pago_movil: "Pago Móvil",
  zelle: "Zelle",
  binance: "Binance (USDT)",
  otro: "Otro",
};
