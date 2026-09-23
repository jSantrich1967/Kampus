"use client";

import Link from "next/link";
import { useState } from "react";

import { KampusAnimatedLogo } from "@/components/brand/kampus-animated-logo";
import { Button } from "@/components/ui/button";
import { authCopy } from "@/lib/i18n/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/80";

export default function RecuperarPage() {
  const t = authCopy.es;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured()) {
      setError(t.supabaseMissing);
      return;
    }

    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: origin
          ? `${origin}/auth/callback?next=${encodeURIComponent("/auth/nueva-clave")}`
          : undefined,
      });
      if (resetErr) {
        setError(t.errorGeneric);
        return;
      }
      setMessage(t.recoverSent);
    } catch {
      setError(t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#131318] p-6">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="flex flex-col items-center transition-colors">
          <KampusAnimatedLogo className="mb-4" />
          <span className="text-sm text-gray-400 hover:text-white">{t.backHome}</span>
        </Link>
      </div>

      <div className="kampus-auth-fade-up w-full max-w-md rounded-3xl border border-white/5 bg-[#1b1b20] p-8 shadow-2xl">
        <h1 className="mb-2 text-2xl font-bold text-white">{t.recoverTitle}</h1>
        <p className="mb-8 text-sm text-gray-400">{t.recoverDescription}</p>

        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="mb-4 text-sm text-teal-200/90">{message}</p> : null}

        <form onSubmit={onSubmit} className="space-y-6">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-gray-300">{t.email}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              placeholder="ejemplo@email.com"
              className={inputClassName}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] py-3 font-semibold text-white shadow-lg shadow-purple-500/20 hover:opacity-90"
            disabled={busy}
          >
            {busy ? "…" : t.recoverSubmit}
          </Button>

          <p className="text-center text-sm text-gray-400">
            <Link href="/login" className="font-medium text-purple-400 hover:underline">
              {t.backToLogin}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
