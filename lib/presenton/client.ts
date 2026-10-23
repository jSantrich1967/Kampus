import type { PresentonServerConfig } from "./config";
import type { PresentonGeneratePayload } from "./payload";

/**
 * Cliente de servidor para la API REST de Presenton (verificado contra el
 * README oficial de presenton/presenton):
 *
 * - Generar: `POST {base}/api/v1/ppt/presentation/generate` (JSON), con
 *   `Authorization: Bearer sk-presenton-...` si hay clave configurada.
 * - Respuesta: `{ presentation_id, path, edit_path }`, donde `path` es la ruta
 *   del archivo exportado en el host de Presenton (bajo `/app_data/...`) y
 *   `edit_path` la ruta del editor web (`/presentation?id=...`).
 */

export class PresentonClientError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PresentonClientError";
    this.status = status;
  }
}

export type PresentonGenerateResult = {
  presentationId: string;
  /** Ruta del archivo en el host de Presenton (tal como la devuelve la API). */
  path: string;
  /** URL absoluta de descarga construida con la base configurada. */
  downloadUrl: string;
  /** Ruta del editor tal como la devuelve la API. */
  editPath: string;
  /** URL absoluta del editor de Presenton. */
  editUrl: string;
};

type FetchImpl = typeof fetch;

function absoluteUrl(baseUrl: string, pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${baseUrl}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export async function generateWithPresenton(
  config: PresentonServerConfig,
  payload: PresentonGeneratePayload,
  fetchImpl: FetchImpl = fetch,
): Promise<PresentonGenerateResult> {
  let res: Response;
  try {
    res = await fetchImpl(`${config.baseUrl}/api/v1/ppt/presentation/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      // La generación puede tardar minutos en Presenton; el límite lo pone la
      // plataforma (maxDuration de la ruta). Abortamos a los 5 min por seguridad.
      signal: AbortSignal.timeout(5 * 60 * 1000),
    });
  } catch (err) {
    throw new PresentonClientError(
      err instanceof Error ? `No se pudo contactar Presenton: ${err.message}` : "No se pudo contactar Presenton.",
      0,
    );
  }

  if (!res.ok) {
    let detail = "";
    try {
      const data: unknown = await res.json();
      if (data && typeof data === "object" && "detail" in data) {
        detail = String((data as { detail: unknown }).detail ?? "");
      }
    } catch {
      // cuerpo no-JSON: nos quedamos con el status
    }
    throw new PresentonClientError(
      `Presenton respondió ${res.status}${detail ? `: ${detail}` : ""}`,
      res.status,
    );
  }

  const data: unknown = await res.json().catch(() => null);
  if (
    !data ||
    typeof data !== "object" ||
    typeof (data as { presentation_id?: unknown }).presentation_id !== "string" ||
    typeof (data as { path?: unknown }).path !== "string" ||
    typeof (data as { edit_path?: unknown }).edit_path !== "string"
  ) {
    throw new PresentonClientError("Presenton devolvió una respuesta inesperada.", 502);
  }

  const { presentation_id, path, edit_path } = data as {
    presentation_id: string;
    path: string;
    edit_path: string;
  };

  return {
    presentationId: presentation_id,
    path,
    downloadUrl: absoluteUrl(config.baseUrl, path),
    editPath: edit_path,
    editUrl: absoluteUrl(config.baseUrl, edit_path),
  };
}
