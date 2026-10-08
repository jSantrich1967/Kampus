import { getClientIpKey, tryConsumeRateToken } from "@/lib/rate-limit/ip-bucket";

/**
 * Acceso de la demo pública (sin cuenta) a funciones de IA puntuales.
 *
 * La demo marca el navegador con la cookie `kampus_demo=1`. El servidor la
 * acepta SOLO con un límite por IP estricto y corto: la demo puede probar
 * la función clave una vez; para seguir usando toca crear la cuenta.
 * La cookie por sí sola no da ningún privilegio persistente ni acceso a
 * datos de nadie: solo habilita esta llamada anónima y limitada.
 */
const DEMO_IP_MAX = 3;
const DEMO_IP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function isDemoCookieRequest(req: Request): boolean {
  const cookie = req.headers.get("cookie") ?? "";
  return cookie.split(";").some((c) => c.trim() === "kampus_demo=1");
}

/** true si esta petición demo todavía tiene cupo; consume un token. */
export function consumeDemoIpToken(req: Request, bucket: string): boolean {
  const ip = getClientIpKey(req);
  const rl = tryConsumeRateToken(`demo:${bucket}:${ip}`, DEMO_IP_MAX, DEMO_IP_WINDOW_MS);
  return rl.ok;
}
