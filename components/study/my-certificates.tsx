"use client";

import { Award, Copy, Check, Loader2, Trash2, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  certificateShareText,
  certificateVerifyUrl,
  deleteCertificate,
  issueCertificate,
  listMyCertificates,
  whatsappShareUrl,
  type Certificate,
} from "@/lib/supabase/certificates-db";
import { cn } from "@/lib/cn";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none";
const labelClass = "text-xs font-medium text-slate-300";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" });
}

export function MyCertificates() {
  const { authUserId, profile } = useKampus();

  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!authUserId || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      setCerts(await listMyCertificates(supabase, authUserId));
    } catch {
      setMessage({ ok: false, text: "No se pudieron cargar tus certificados." });
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleIssue() {
    if (!authUserId || !isSupabaseConfigured()) return;
    const ownerName = profile.displayName.trim() || "Estudiante Kampus";
    if (!title.trim()) {
      setMessage({ ok: false, text: "Escribe el nombre del curso o logro." });
      return;
    }
    setIssuing(true);
    setMessage(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const cert = await issueCertificate(supabase, {
        ownerId: authUserId,
        ownerName,
        title: title.trim(),
        detail: detail.trim(),
      });
      setCerts((prev) => [cert, ...prev]);
      setTitle("");
      setDetail("");
      setMessage({ ok: true, text: `Certificado emitido con código ${cert.code}. ¡Compártelo!` });
    } catch {
      setMessage({ ok: false, text: "No se pudo emitir el certificado. Inténtalo de nuevo." });
    } finally {
      setIssuing(false);
    }
  }

  async function handleDelete(id: string) {
    if (!isSupabaseConfigured()) return;
    setDeletingId(id);
    try {
      const supabase = createSupabaseBrowserClient();
      await deleteCertificate(supabase, id);
      setCerts((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setMessage({ ok: false, text: "No se pudo eliminar." });
    } finally {
      setDeletingId(null);
    }
  }

  async function handleCopy(cert: Certificate) {
    const origin = window.location.origin;
    try {
      await navigator.clipboard.writeText(certificateVerifyUrl(origin, cert.code));
      setCopiedCode(cert.code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      /* portapapeles no disponible */
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Estudio"
        title="Mis certificados"
        description="Emite un certificado por cada curso o logro que completes. Cada uno tiene un código público de verificación que puedes compartir."
      />

      {message ? (
        <p className={cn("text-sm", message.ok ? "text-emerald-300" : "text-rose-300")}>{message.text}</p>
      ) : null}

      <Card className="border-white/10">
        <CardHeader>
          <CardTitle className="text-base">Emitir certificado</CardTitle>
          <CardDescription>Para ti, por un curso, taller o meta que completaste.</CardDescription>
        </CardHeader>
        <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Curso o logro</label>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Curso de Biología — Nivel 1"
            />
          </div>
          <div>
            <label className={labelClass}>Detalle (opcional)</label>
            <input
              className={inputClass}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              placeholder="40 horas · Promedio 18/20"
            />
          </div>
          <div className="sm:col-span-2">
            <Button type="button" onClick={() => void handleIssue()} disabled={issuing} className="gap-2">
              {issuing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Award className="h-4 w-4" />}
              {issuing ? "Emitiendo…" : "Emitir mi certificado"}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {loading ? (
          <p className="text-sm text-slate-400">Cargando…</p>
        ) : certs.length === 0 ? (
          <Card className="border-dashed border-white/15 sm:col-span-2">
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Award className="h-8 w-8 text-slate-500" />
              <p className="text-sm text-slate-400">Aún no tienes certificados. Emite el primero arriba.</p>
            </div>
          </Card>
        ) : (
          certs.map((cert) => {
            const origin = typeof window !== "undefined" ? window.location.origin : "";
            const verifyUrl = origin ? certificateVerifyUrl(origin, cert.code) : "";
            return (
              <Card key={cert.id} className="border-amber-400/20 bg-amber-500/5">
                <div className="space-y-3 px-6 py-5">
                  <div className="flex items-start justify-between gap-2">
                    <Award className="h-8 w-8 text-amber-300" />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-rose-200"
                      disabled={deletingId === cert.id}
                      onClick={() => void handleDelete(cert.id)}
                    >
                      {deletingId === cert.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                  <div>
                    <p className="font-semibold text-white">{cert.title}</p>
                    <p className="text-sm text-slate-300">{cert.ownerName}</p>
                    {cert.detail ? <p className="text-xs text-slate-500">{cert.detail}</p> : null}
                    <p className="mt-1 text-xs text-slate-500">
                      Emitido el {formatDate(cert.issuedAt)} · Código {cert.code}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="secondary" onClick={() => void handleCopy(cert)} className="gap-1.5">
                      {copiedCode === cert.code ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      {copiedCode === cert.code ? "¡Copiado!" : "Copiar enlace"}
                    </Button>
                    {verifyUrl ? (
                      <a
                        href={whatsappShareUrl(certificateShareText(origin, cert))}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/20"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        Compartir por WhatsApp
                      </a>
                    ) : null}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
