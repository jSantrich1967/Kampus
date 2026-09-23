"use client";

import useSWR from "swr";

import {
  BCV_FALLBACK_DATE,
  BCV_FALLBACK_RATE,
  formatBcvDate,
  formatBs,
} from "@/lib/bcv";

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error("bcv-rate unavailable");
    return res.json();
  });

interface BcvApiResponse {
  rate: number;
  date: string;
  live: boolean;
}

function useBcvRate() {
  const { data } = useSWR<BcvApiResponse>("/api/bcv-rate", fetcher);
  return {
    rate: data?.rate ?? BCV_FALLBACK_RATE,
    date: data?.date ?? BCV_FALLBACK_DATE,
    live: data?.live ?? false,
  };
}

/** Precio de un plan en bolívares, calculado con la tasa BCV del día. */
export function BcvPrice({ usdPrice }: { usdPrice: number }) {
  const { rate, date } = useBcvRate();
  return (
    <>
      <p className="text-sm font-semibold text-purple-300">{formatBs(usdPrice * rate)} / mes</p>
      <p className="mb-2 text-xs text-gray-400">Tasa oficial BCV · {formatBcvDate(date)}</p>
    </>
  );
}

/** Nota al pie de la sección de precios con la fecha de la tasa vigente. */
export function BcvRateNote() {
  const { date } = useBcvRate();
  return (
    <p className="mx-auto mt-10 max-w-7xl px-6 text-center text-xs text-gray-400">
      Precio en bolívares calculado a la tasa oficial del BCV del {formatBcvDate(date)}. La tasa
      se actualiza automáticamente todos los días.
    </p>
  );
}
