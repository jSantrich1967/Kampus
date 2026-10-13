"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

/**
 * Tarjeta "Repasos pendientes: N" en Hoy. Solo se muestra cuando hay
 * tarjetas vencidas; lleva a /repasos. No consume cuota: es solo lectura.
 */
export function TodayReviewsCard() {
  const { authUserId, profile } = useKampus();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (!authUserId || profile.role !== "student") return;
    let alive = true;
    fetch("/api/reviews/due")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setCount(typeof j?.count === "number" ? j.count : 0);
      })
      .catch(() => {
        if (alive) setCount(0);
      });
    return () => {
      alive = false;
    };
  }, [authUserId, profile.role]);

  if (count === null || count === 0) return null;

  return (
    <Card className="border-emerald-400/25 bg-emerald-500/[0.06]">
      <CardHeader>
        <CardTitle className="text-base">
          Repasos pendientes: {count}
        </CardTitle>
        <CardDescription>
          Tus tarjetas están listas para repasar justo antes de que las olvides.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-wrap gap-2 px-6 pb-6">
        <Link href="/repasos" className={buttonClasses({ size: "sm" })}>
          Empezar repaso
        </Link>
      </div>
    </Card>
  );
}
