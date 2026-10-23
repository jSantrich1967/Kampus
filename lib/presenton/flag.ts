/**
 * Feature flag del piloto Presenton (client-safe: solo lee la variable pública).
 * Apagado por defecto: sin `NEXT_PUBLIC_PRESENTON_PILOT_ENABLED=true` la función
 * no aparece en la UI y la ruta API responde 503.
 */
export function isPresentonPilotEnabled(): boolean {
  return process.env.NEXT_PUBLIC_PRESENTON_PILOT_ENABLED === "true";
}
