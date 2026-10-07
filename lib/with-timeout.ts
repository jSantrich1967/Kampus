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
