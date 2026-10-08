import Link from "next/link";
import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Pantalla estándar "esto es del plan Pro": lo dice claro, pone el precio
 * y ofrece activar, en vez de rebotar al usuario en silencio a otra página.
 */
export function ProRequiredCard({
  feature,
  eyebrow,
  description,
}: {
  feature: string;
  eyebrow: string;
  description: string;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={`${feature} es del plan Pro`}
        description={description}
      />
      <Card className="border-purple-400/25 bg-purple-500/[0.06]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" aria-hidden />
            Activa Pro por $10,30 al mes
          </CardTitle>
          <CardDescription>
            Pagas por Pago Móvil o Zelle, reportas tu pago y te activamos el mismo día. Sin
            renovación automática: pagas solo los meses que quieras.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2 px-6 pb-6">
          <Link href="/pro" className={buttonClasses({ size: "sm" })}>
            Pasarme a Pro
          </Link>
          <Link href="/today" className={buttonClasses({ size: "sm", variant: "secondary" })}>
            Volver a Hoy
          </Link>
        </div>
      </Card>
    </div>
  );
}
