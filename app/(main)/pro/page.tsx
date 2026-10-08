"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, CreditCard, Loader2 } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PAYMENT_INFO, PAYMENT_METHOD_LABELS, PRO_PRICE_USD, type PaymentMethod } from "@/lib/billing/payment-info";
import type { BillingStatus } from "@/app/api/billing/me/route";

export default function ProPage() {
  const { profile } = useKampus();
  const [status, setStatus] = useState<BillingStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [method, setMethod] = useState<PaymentMethod>("pago_movil");
  const [reference, setReference] = useState("");
  const [months, setMonths] = useState(1);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/billing/me");
        if (!res.ok) throw new Error("billing_me");
        const data = (await res.json()) as BillingStatus;
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatusError("No pudimos cargar tu estado de plan.");
      }
      try {
        const res = await fetch("/api/bcv-rate");
        const data = (await res.json()) as { rate?: number };
        if (!cancelled && typeof data.rate === "number") setBcvRate(data.rate);
      } catch {
        /* sin tasa: solo mostramos USD */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalUsd = PRO_PRICE_USD * months;
  const totalBs = bcvRate ? totalUsd * bcvRate : null;
  const configured = PAYMENT_INFO.configured;

  async function submitReport() {
    if (sending || reference.trim().length < 4) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await fetch("/api/billing/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method, reference: reference.trim(), months }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No pudimos registrar tu pago.");
      setSent(true);
    } catch (e) {
      setSendError(e instanceof Error ? e.message : "No pudimos registrar tu pago.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Plan Pro"
        title="Pasarte a Pro"
        description="Pro cuesta $10,30 al mes. Pagas por Pago Móvil o Zelle, reportas tu pago aquí y te activamos el mismo día."
      />

      {statusError ? <p className="text-sm text-rose-300">{statusError}</p> : null}

      {status?.active ? (
        <Card className="border-emerald-400/25 bg-emerald-500/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-100">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Ya eres Pro
            </CardTitle>
            <CardDescription>
              Tu plan está activo
              {status.expiresAt
                ? ` hasta el ${new Date(status.expiresAt).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" })}`
                : ""}
              . Si quieres extenderlo, reporta otro pago y se suma a tu fecha actual.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {status?.pending && !sent ? (
        <Card className="border-amber-400/25 bg-amber-500/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-100">
              <Clock className="h-4 w-4" aria-hidden />
              Pago en revisión
            </CardTitle>
            <CardDescription>
              Recibimos tu reporte ({PAYMENT_METHOD_LABELS[status.pending.method as PaymentMethod] ?? status.pending.method} · ref. {status.pending.reference}). Te activamos en menos de 24 horas.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {sent ? (
        <Card className="border-emerald-400/25 bg-emerald-500/[0.06]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-100">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Pago reportado
            </CardTitle>
            <CardDescription>
              Listo, {profile.displayName || "tu pago"} quedó registrado. Lo verificamos y activamos tu Pro en menos de 24 horas; te llega la confirmación por WhatsApp si tienes los avisos activos.
            </CardDescription>
          </CardHeader>
          <div className="px-6 pb-6">
            <Link href="/today" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Volver a Hoy
            </Link>
          </div>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" aria-hidden />
              1. Haz tu pago
            </CardTitle>
            <CardDescription>
              Total: <span className="font-semibold text-white">US$ {totalUsd.toFixed(2)}</span>
              {totalBs
                ? ` ≈ Bs ${totalBs.toLocaleString("es-VE", { maximumFractionDigits: 2 })} a la tasa BCV de hoy`
                : ""}
              . Sin renovación automática: pagas cuando quieres seguir.
            </CardDescription>
          </CardHeader>
          <div className="space-y-4 px-6 pb-6">
            {!configured ? (
              <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Estamos activando los datos de cobro en este momento. Vuelve en unas horas y
                aquí verás el Pago Móvil y el Zelle para pagar tu Pro.
              </p>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pago Móvil</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {PAYMENT_INFO.pagoMovil.bank} · {PAYMENT_INFO.pagoMovil.phone}
                      <br />
                      C.I. {PAYMENT_INFO.pagoMovil.idNumber} · {PAYMENT_INFO.pagoMovil.holder}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Zelle</p>
                    <p className="mt-1 text-sm text-slate-200">
                      {PAYMENT_INFO.zelle.email}
                      <br />
                      {PAYMENT_INFO.zelle.holder}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="pro-method">
                      Método
                    </label>
                    <select
                      id="pro-method"
                      value={method}
                      onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                    >
                      {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((m) => (
                        <option key={m} value={m} className="bg-slate-900">
                          {PAYMENT_METHOD_LABELS[m]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="pro-months">
                      Meses
                    </label>
                    <select
                      id="pro-months"
                      value={months}
                      onChange={(e) => setMonths(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white"
                    >
                      {[1, 3, 6].map((m) => (
                        <option key={m} value={m} className="bg-slate-900">
                          {m} {m === 1 ? "mes" : "meses"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="pro-reference">
                      Referencia del pago
                    </label>
                    <input
                      id="pro-reference"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="Ej. 12345678"
                      className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {sendError ? <p role="alert" className="text-sm text-rose-300">{sendError}</p> : null}

                <Button onClick={submitReport} disabled={sending || reference.trim().length < 4}>
                  {sending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Registrando…
                    </span>
                  ) : (
                    "Ya pagué: reportar mi pago"
                  )}
                </Button>
                <p className="text-xs text-slate-500">
                  Verificamos cada pago a mano antes de activar. Si la referencia no coincide, te
                  contactamos por tu WhatsApp registrado.
                </p>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
