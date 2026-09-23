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

export default function NuevaClavePage() {
  const t = authCopy.es;
  const [password, setPassword] = useState("");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setError(t.newPasswordInvalid);
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(t.errorGeneric);
        return;
      }
      setMessage(t.newPasswordSuccess);
      setPassword("");
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
        <h1 className="mb-2 text-2xl font-bold text-white">{t.newPasswordTitle}</h1>
        <p className="mb-8 text-sm text-gray-400">{t.newPasswordDescription}</p>

        {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}
        {message ? <p className="mb-4 text-sm text-teal-200/90">{message}</p> : null}

        {message ? (
          <div className="flex flex-col gap-4">
            <Link
              href="/login"
              className="w-full rounded-xl bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] py-3 text-center font-semibold text-white shadow-lg shadow-purple-500/20 hover:opacity-90"
            >
              {t.backToLogin}
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-gray-300">{t.password}</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={6}
                placeholder="••••••••"
                className={inputClassName}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <span className="block text-xs text-gray-400">{t.passwordHint}</span>
            </label>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] py-3 font-semibold text-white shadow-lg shadow-purple-500/20 hover:opacity-90"
              disabled={busy}
            >
              {busy ? "…" : t.newPasswordSubmit}
            </Button>

            <p className="text-center text-sm text-gray-400">
              <Link href="/auth/recuperar" className="font-medium text-purple-400 hover:underline">
                {t.requestNewLink}
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
