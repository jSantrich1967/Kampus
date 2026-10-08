"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, CreditCard, Loader2, ShieldAlert, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/billing/payment-info";

type PaymentItem = {
  id: string;
  user_id: string;
  months: number;
  amount_usd: number;
  method: string;
  reference: string;
  status: string;
  reported_at: string;
  expires_at: string | null;
  receipt_path: string | null;
  studentName: string;
  studentPhone: string;
};

function formatDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminPagosPage() {
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setDenied(false);
    try {
      const res = await fetch("/api/admin/payments");
      if (res.status === 403 || res.status === 401) {
        setDenied(true);
        setItems([]);
        return;
      }
      const data = (await res.json()) as { payments?: PaymentItem[] };
      setItems(data.payments ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function openReceipt(id: string) {
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "receipt" }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "No se pudo abrir el comprobante.");
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el comprobante.");
    }
  }

  async function act(id: string, action: "activate" | "reject") {
    setActing(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No se pudo procesar el pago.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo procesar el pago.");
    } finally {
      setActing(null);
    }
  }

  const pending = items.filter((i) => i.status === "pending");
  const active = items.filter((i) => i.status === "active");

  if (denied) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Admin" title="Pagos Pro" />
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4" aria-hidden /> Sin permiso
            </CardTitle>
          </CardHeader>
          <p className="px-6 pb-6 text-sm text-slate-400">
            Esta pantalla es solo para administradores de Kampus.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin"
        title="Pagos Pro"
        description="Verifica cada pago contra tu banco o Zelle y actívalo aquí. El plan se aplica en el servidor y vence solo."
      />

      {error ? <p role="alert" className="text-sm text-rose-300">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando pagos…
        </div>
      ) : null}

      {!loading && pending.length === 0 ? (
        <p className="text-sm text-slate-400">No hay pagos esperando revisión.</p>
      ) : null}

      <div className="space-y-3">
        {pending.map((p) => (
          <Card key={p.id}>
            <CardHeader>
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" aria-hidden />
                {p.studentName || "Estudiante"} · US$ {Number(p.amount_usd).toFixed(2)} · {p.months} {p.months === 1 ? "mes" : "meses"}
              </CardTitle>
              <p className="text-sm text-slate-400">
                {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method} · Referencia{" "}
                <span className="font-mono text-slate-200">{p.reference}</span> · Reportado {formatDate(p.reported_at)}
                {p.studentPhone ? ` · WhatsApp ${p.studentPhone}` : ""}
              </p>
            </CardHeader>
            <div className="flex flex-wrap gap-2 px-6 pb-6">
              <Button size="sm" disabled={acting === p.id} onClick={() => void act(p.id, "activate")} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                {acting === p.id ? "Procesando…" : "Verificado: activar Pro"}
              </Button>
              <Button size="sm" variant="secondary" disabled={acting === p.id} onClick={() => void act(p.id, "reject")} className="gap-1.5">
                <XCircle className="h-3.5 w-3.5" aria-hidden />
                Rechazar
              </Button>
              {p.receipt_path ? (
                <Button size="sm" variant="ghost" onClick={() => void openReceipt(p.id)} className="gap-1.5">
                  Ver comprobante
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>

      {active.length > 0 ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Pro activos</h2>
          {active.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {p.studentName || "Estudiante"} · vence {formatDate(p.expires_at)}
                </CardTitle>
                <p className="text-sm text-slate-400">
                  {PAYMENT_METHOD_LABELS[p.method as PaymentMethod] ?? p.method} · ref. {p.reference}
                </p>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : null}
    </div>
  );
}
