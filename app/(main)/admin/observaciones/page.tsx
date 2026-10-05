"use client";

import { useEffect, useState } from "react";
import { Inbox, Loader2, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

type FeedbackItem = {
  id: string;
  user_id: string;
  category: string;
  message: string;
  page: string | null;
  status: string;
  created_at: string;
};

const STATUSES = ["nueva", "revisada", "aplicada", "descartada"] as const;

const CATEGORY_LABEL: Record<string, string> = {
  error: "Error",
  sugerencia: "Sugerencia",
  mejora: "Mejora",
  otro: "Otro",
};

const STATUS_STYLE: Record<string, string> = {
  nueva: "bg-sky-500/15 text-sky-200 border-sky-400/30",
  revisada: "bg-amber-500/15 text-amber-200 border-amber-400/30",
  aplicada: "bg-emerald-500/15 text-emerald-200 border-emerald-400/30",
  descartada: "bg-slate-500/15 text-slate-300 border-slate-400/30",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("es", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

export default function AdminObservacionesPage() {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [filter, setFilter] = useState<string>("nueva");
  const [updating, setUpdating] = useState<string | null>(null);

  async function load(status: string) {
    setLoading(true);
    setDenied(false);
    try {
      const res = await fetch(`/api/admin/feedback${status ? `?status=${status}` : ""}`);
      if (res.status === 403) {
        setDenied(true);
        setItems([]);
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { feedback?: FeedbackItem[] };
      setItems(data.feedback ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function setStatus(id: string, status: string) {
    setUpdating(id);
    try {
      const res = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (res.ok) {
        setItems((prev) =>
          filter ? prev.filter((f) => f.id !== id) : prev.map((f) => (f.id === id ? { ...f, status } : f)),
        );
      }
    } finally {
      setUpdating(null);
    }
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-rose-300/70" aria-hidden />
        <p className="mt-3 font-medium text-white">Sin permiso</p>
        <p className="mt-1 text-sm text-slate-400">Esta sección es solo para administradores de la aplicación.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader
        eyebrow="Administración"
        title="Observaciones de mejora"
        description="Lo que los usuarios reportan desde cada sección de la app."
      />

      <div className="flex flex-wrap gap-2">
        {["", ...STATUSES].map((s) => (
          <button
            key={s || "todas"}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1.5 text-xs transition ${
              filter === s
                ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-100"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-white/25"
            }`}
          >
            {s === "" ? "Todas" : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Cargando…
        </p>
      ) : items.length === 0 ? (
        <Card>
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <Inbox className="h-10 w-10 text-slate-500" aria-hidden />
            <p className="mt-3 font-medium text-white">Sin observaciones</p>
            <p className="mt-1 text-sm text-slate-400">No hay observaciones con este filtro.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <Card key={f.id}>
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-slate-200">
                    {CATEGORY_LABEL[f.category] ?? f.category}
                  </span>
                  {f.page ? (
                    <span className="rounded-full border border-indigo-400/30 bg-indigo-500/10 px-2.5 py-0.5 text-xs text-indigo-200">
                      {f.page}
                    </span>
                  ) : null}
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs ${STATUS_STYLE[f.status] ?? STATUS_STYLE.nueva}`}>
                    {f.status}
                  </span>
                  <span className="ml-auto text-xs text-slate-500">{formatDate(f.created_at)}</span>
                </div>
                <CardTitle className="mt-3 text-base font-normal leading-relaxed text-slate-100">
                  {f.message}
                </CardTitle>
                <div className="mt-3 flex flex-wrap gap-2">
                  {STATUSES.filter((s) => s !== f.status).map((s) => (
                    <Button
                      key={s}
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={updating === f.id}
                      onClick={() => void setStatus(f.id, s)}
                    >
                      {updating === f.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                      Marcar {s}
                    </Button>
                  ))}
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
