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
  /** After sign-up without immediate session (email confirmation flow). */
  const [pendingEmailVerification, setPendingEmailVerification] = useState(false);

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

  function formatSupabaseAuthErrorMessage(raw: string | undefined): string {
    const msg = (raw ?? "").toLowerCase();
    if (msg.includes("failed to fetch") || msg.includes("network error") || msg.includes("load failed")) {
      return t.errorFailedToFetch;
    }
    if (msg.includes("email") && msg.includes("confirm")) return t.errorEmailNotConfirmed;
    if (msg.includes("not confirmed")) return t.errorEmailNotConfirmed;
    if (msg.includes("user already registered")) return t.errorUserAlreadyRegistered;
    if (msg.includes("invalid login credentials")) return t.errorInvalidLoginCredentials;
    return raw || t.errorGeneric;
  }

  function authNetworkErrorMessage(err: unknown): string | null {
    if (!(err instanceof Error)) return null;
    const m = err.message.toLowerCase();
    if (err instanceof TypeError && m.includes("fetch")) return t.errorFailedToFetch;
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
      return t.errorFailedToFetch;
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured()) {
      setError(t.supabaseMissing);
      return;
    }

    setBusy(true);
    setPendingEmailVerification(false);
    try {
      const supabase = createSupabaseBrowserClient();
      if (mode === "login") {
        const { error: signErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signErr) {
          setError(formatSupabaseAuthErrorMessage(signErr.message));
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
        setError(formatSupabaseAuthErrorMessage(signUpErr.message));
        return;
      }
      if (data.session) {
        setMessage(t.registerSuccess);
        setPendingEmailVerification(false);
        router.replace(nextPath);
        router.refresh();
        return;
      }
      setPendingEmailVerification(true);
      setMessage(`${t.registerSuccess} ${t.checkEmail}`);
    } catch (err) {
      const net = authNetworkErrorMessage(err);
      setError(net ?? t.errorGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function resendConfirmationEmail() {
    setError(null);
    if (!email.trim()) {
      setError(t.errorGeneric);
      return;
    }
    setBusy(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const callbackNext = encodeURIComponent(nextPath);
      const { error: resendErr } = await supabase.auth.resend({
        type: "signup",
        email: email.trim(),
        options: origin
          ? { emailRedirectTo: `${origin}/auth/callback?next=${callbackNext}` }
          : undefined,
      });
      if (resendErr) {
        setError(formatSupabaseAuthErrorMessage(resendErr.message));
        return;
      }
      setMessage(t.resendSent);
    } catch (err) {
      const net = authNetworkErrorMessage(err);
      setError(net ?? t.errorGeneric);
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

            {pendingEmailVerification && mode === "register" ? (
              <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3">
                <p className="text-xs leading-relaxed text-slate-400">{t.emailDeliveryHint}</p>
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void resendConfirmationEmail()}
                >
                  {busy ? "…" : t.resendConfirmation}
                </Button>
              </div>
            ) : null}

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
