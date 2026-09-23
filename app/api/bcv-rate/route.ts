import { NextResponse } from "next/server";

import { getBcvRate } from "@/lib/bcv";

export const runtime = "nodejs";
// La tasa oficial se publica una vez al día hábil; revalidar cada 12 h es suficiente.
export const revalidate = 43_200;

export async function GET() {
  const { rate, date, live } = await getBcvRate();
  return NextResponse.json(
    { rate, date, live, currency: "USD", source: "BCV (oficial)" },
    {
      headers: {
        "Cache-Control": "public, s-maxage=43200, stale-while-revalidate=86400",
      },
    },
  );
}
