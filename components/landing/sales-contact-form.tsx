"use client";

import { useEffect, useState } from "react";
import { Loader2, Mail, X } from "lucide-react";

import { cn } from "@/lib/cn";
import {
  KAMPUS_SALES_EMAIL,
  SALES_STUDENT_RANGES,
  type SalesContactPayload,
} from "@/lib/schemas/sales-contact";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-all placeholder:text-gray-500 focus:ring-2 focus:ring-purple-500/80";

type SalesContactFormProps = {
  className?: string;
  /** Shorter title when embedded in the footer. */
  compact?: boolean;
  onSuccess?: () => void;
};

export function SalesContactForm({ className, compact = false, onSuccess }: SalesContactFormProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState<SalesContactPayload>({
    name: "",
    email: "",
    institution: "",
    students: undefined,
    message: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/contact/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; message?: string };

      if (!res.ok) {
        setError(data.error ?? "No pudimos enviar tu solicitud. Inténtalo de nuevo.");
        return;
      }

      setSuccess(data.message ?? "Solicitud enviada correctamente.");
      setForm({ name: "", email: "", institution: "", students: undefined, message: "" });
      onSuccess?.();
    } catch {
      setError("Error de red. Comprueba tu conexión e inténtalo otra vez.");
    } finally {
      setBusy(false);
    }
  }

  if (success) {
    return (
      <div className={cn("rounded-2xl border border-purple-500/30 bg-purple-500/10 p-6 text-center", className)}>
        <p className="font-medium text-white">{success}</p>
        <p className="mt-2 text-sm text-gray-400">
          También puedes escribirnos directamente a{" "}
          <a href={`mailto:${KAMPUS_SALES_EMAIL}`} className="text-purple-400 hover:underline">
            {KAMPUS_SALES_EMAIL}
          </a>
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-5", className)}>
      {!compact ? (
        <div>
          <h3 className="text-xl font-bold text-white">Hablemos de tu institución</h3>
          <p className="mt-1 text-sm text-gray-400">
            Cuéntanos qué necesitas y nuestro equipo de ventas te responderá en 24–48 horas laborables.
          </p>
        </div>
      ) : null}

      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-gray-300">Nombre completo</span>
          <input
            type="text"
            name="name"
            required
            autoComplete="name"
            placeholder="María García"
            className={inputClassName}
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
          />
        </label>

        <label className="block space-y-2 sm:col-span-1">
          <span className="text-sm font-medium text-gray-300">Correo institucional</span>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="nombre@ejemplo.com"
            className={inputClassName}
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
        </label>

        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-gray-300">Institución / centro</span>
          <input
            type="text"
            name="institution"
            required
            placeholder="Universidad, academia o centro formativo"
            className={inputClassName}
            value={form.institution}
            onChange={(e) => setForm((prev) => ({ ...prev, institution: e.target.value }))}
          />
        </label>

        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-gray-300">Estudiantes aproximados (opcional)</span>
          <select
            name="students"
            className={cn(inputClassName, "text-gray-300")}
            value={form.students ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                students: e.target.value ? (e.target.value as SalesContactPayload["students"]) : undefined,
              }))
            }
          >
            <option value="">Selecciona un rango</option>
            {SALES_STUDENT_RANGES.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-[#1b1b20]">
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-2 sm:col-span-2">
          <span className="text-sm font-medium text-gray-300">Mensaje</span>
          <textarea
            name="message"
            required
            rows={compact ? 4 : 5}
            placeholder="Cuéntanos qué módulos te interesan, plazos de despliegue, integración LMS…"
            className={cn(inputClassName, "resize-y min-h-[120px]")}
            value={form.message}
            onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition-all hover:opacity-90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Mail className="h-4 w-4" aria-hidden />}
        {busy ? "Enviando…" : "Enviar solicitud"}
      </button>
    </form>
  );
}

type SalesContactModalProps = {
  open: boolean;
  onClose: () => void;
};

export function SalesContactModal({ open, onClose }: SalesContactModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        aria-label="Cerrar formulario"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sales-contact-title"
        className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-[#1b1b20] p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-gray-400 transition-colors hover:text-white"
          aria-label="Cerrar"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </button>

        <div id="sales-contact-title" className="sr-only">
          Contactar ventas institucionales
        </div>

        <SalesContactForm />
      </div>
    </div>
  );
}

export function SalesContactButton({
  className,
  children = "Contactar ventas",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
      <SalesContactModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
