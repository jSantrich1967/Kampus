"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { KampusLogo } from "@/components/brand/kampus-logo";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authCopy } from "@/lib/i18n/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSafeInternalRedirect } from "@/lib/supabase/safe-redirect";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring";

type EmailAuthPanelProps = {
  mode: "login" | "register";
};

export function EmailAuthPanel({ mode }: EmailAuthPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, authUserId } = useKampus();
  const t = authCopy.es;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const urlError = searchParams.get("error");
  const nextPath = getSafeInternalRedirect(searchParams.get("next"));

  useEffect(() => {
    if (!hydrated || !authUserId) return;
    router.replace(nextPath);
  }, [hydrated, authUserId, router, nextPath]);

  useEffect(() => {
    if (urlError === "auth") {
      setError(t.errorGeneric);
    }
  }, [urlError, t.errorGeneric]);

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
      if (mode === "login") {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signErr) {
          setError(t.errorGeneric);
          return;
        }
        router.replace(nextPath);
        router.refresh();
        return;
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const callbackNext = encodeURIComponent(nextPath);
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: origin ? `${origin}/auth/callback?next=${callbackNext}` : undefined,
        },
      });
      if (signUpErr) {
        setError(t.errorGeneric);
        return;
      }
      if (data.session) {
        setMessage(t.registerSuccess);
        router.replace(nextPath);
        router.refresh();
        return;
      }
      setMessage(`${t.registerSuccess} ${t.checkEmail}`);
    } finally {
      setBusy(false);
    }
  }

  const configured = isSupabaseConfigured();
  const nextQuery = searchParams.get("next");
  const loginHref = nextQuery ? `/login?next=${encodeURIComponent(nextQuery)}` : "/login";
  const registerHref = nextQuery ? `/register?next=${encodeURIComponent(nextQuery)}` : "/register";

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-16">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex flex-col items-center gap-2">
          <KampusLogo variant="sidebar" />
          <span className="text-xs text-slate-500">{t.backHome}</span>
        </Link>
      </div>

      <Card className="w-full max-w-md border-white/10 bg-slate-950/40 shadow-xl shadow-indigo-950/20">
        <CardHeader>
          <CardTitle>{mode === "login" ? t.loginTitle : t.registerTitle}</CardTitle>
          <CardDescription>{mode === "login" ? t.loginDescription : t.registerDescription}</CardDescription>
        </CardHeader>

        {!configured ? (
          <p className="text-sm text-amber-200/90">{t.supabaseMissing}</p>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <label className="space-y-2 text-sm">
              <span className="text-slate-300">{t.email}</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                className={inputClassName}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="text-slate-300">{t.password}</span>
              <input
                type="password"
                name="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={6}
                className={inputClassName}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="text-sm text-teal-200/90">{message}</p> : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? "…" : mode === "login" ? t.submitLogin : t.submitRegister}
            </Button>

            <p className="text-center text-sm text-slate-400">
              {mode === "login" ? (
                <>
                  {t.noAccount}{" "}
                  <Link href={registerHref} className="font-medium text-indigo-300 hover:text-indigo-200">
                    {t.registerLink}
                  </Link>
                </>
              ) : (
                <>
                  {t.hasAccount}{" "}
                  <Link href={loginHref} className="font-medium text-indigo-300 hover:text-indigo-200">
                    {t.loginLink}
                  </Link>
                </>
              )}
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
