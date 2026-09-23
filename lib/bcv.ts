// Tasa oficial USD/BCV para mostrar precios en bolívares.
//
// Fuente: ve.dolarapi.com (réplica de la tasa oficial publicada por el BCV),
// con revalidación de 12 h y fallback a la última tasa verificada manualmente
// si la fuente no responde.

export const BCV_FALLBACK_RATE = 853.4993;
export const BCV_FALLBACK_DATE = "2026-09-23";
export const BCV_SOURCE_URL = "https://ve.dolarapi.com/v1/dolares/oficial";

export interface BcvRate {
  /** Bolívares por cada dólar estadounidense. */
  rate: number;
  /** Fecha de la tasa en formato YYYY-MM-DD. */
  date: string;
  /** false cuando se está usando la tasa de respaldo verificada. */
  live: boolean;
}

interface DolarApiResponse {
  promedio?: number | null;
  fechaActualizacion?: string | null;
}

export async function getBcvRate(): Promise<BcvRate> {
  try {
    const res = await fetch(BCV_SOURCE_URL, {
      next: { revalidate: 43_200 }, // 12 horas
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`BCV source responded ${res.status}`);
    const data = (await res.json()) as DolarApiResponse;
    const rate =
      typeof data.promedio === "number" && data.promedio > 0 ? data.promedio : NaN;
    if (!Number.isFinite(rate)) throw new Error("Invalid rate payload");
    const date = data.fechaActualizacion?.slice(0, 10) ?? BCV_FALLBACK_DATE;
    return { rate, date, live: true };
  } catch {
    return { rate: BCV_FALLBACK_RATE, date: BCV_FALLBACK_DATE, live: false };
  }
}

/** "Bs. 8.788,93" */
export function formatBs(value: number): string {
  return `Bs. ${value.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** "2026-09-23" -> "23/09/2026" */
export function formatBcvDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}
