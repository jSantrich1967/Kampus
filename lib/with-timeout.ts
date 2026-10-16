/**
 * Envuelve una promesa con un tiempo límite. Si Supabase (o cualquier
 * llamada remota) se cuelga, la interfaz muestra un error en vez de
 * quedarse en "Cargando…" para siempre.
 */
export async function withTimeout<T>(promise: Promise<T>, ms = 20_000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error("La operación tardó demasiado. Revisa tu conexión e inténtalo de nuevo.")),
          ms,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Como `withTimeout`, pero el temporizador también ABORTA la operación
 * subyacente: evita que una petición lenta se complete en el servidor después
 * de que el cliente ya mostró el error (p. ej. un post "fantasma" que aparece
 * al recargar aunque la UI dijo que falló).
 */
export async function withTimeoutSignal<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  ms = 20_000,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("La operación tardó demasiado. Revisa tu conexión e inténtalo de nuevo.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Mensaje amable para errores de llamadas de IA en el cliente: convierte el
 * timeout/abort del navegador (mensaje técnico en inglés) en una frase
 * clara con reintento; el resto pasa por el mensaje original o el fallback.
 */
export function aiErrorMessage(e: unknown, fallback: string): string {
  if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
    return "La IA tardó demasiado en responder. Inténtalo de nuevo en un momento.";
  }
  if (e instanceof TypeError) {
    return "No se pudo conectar. Revisa tu conexión e inténtalo de nuevo.";
  }
  return e instanceof Error && e.message ? e.message : fallback;
}
