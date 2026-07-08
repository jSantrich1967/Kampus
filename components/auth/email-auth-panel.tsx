"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { GoogleIcon } from "@/components/auth/google-icon";
import { KampusAnimatedLogo } from "@/components/brand/kampus-animated-logo";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { authCopy } from "@/lib/i18n/auth";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSafeInternalRedirect } from "@/lib/supabase/safe-redirect";

const inputClassName =
  "w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none transition-all focus:ring-2 focus:ring-purple-500/80";

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
    if (msg.includes("provider") && msg.includes("not enabled")) return t.errorOAuthProvider;
    if (msg.includes("oauth")) return t.errorOAuthProvider;
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

  async function signInWithGoogle() {
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
      const callbackNext = encodeURIComponent(nextPath);
      const redirectTo = origin ? `${origin}/auth/callback?next=${callbackNext}` : undefined;
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      if (oauthErr) {
        setError(formatSupabaseAuthErrorMessage(oauthErr.message));
        setBusy(false);
      }
    } catch (err) {
      const net = authNetworkErrorMessage(err);
      setError(net ?? t.errorGeneric);
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
    <div className="flex min-h-dvh flex-col items-center justify-center bg-[#131318] p-6">
      <div className="mb-8 flex flex-col items-center">
        <Link href="/" className="flex flex-col items-center transition-colors">
          <KampusAnimatedLogo className="mb-4" />
          <span className="text-sm text-gray-400 hover:text-white">{t.backHome}</span>
        </Link>
      </div>

      <div className="kampus-auth-fade-up w-full max-w-md rounded-3xl border border-white/5 bg-[#1b1b20] p-8 shadow-2xl">
        <h1 className="mb-2 text-2xl font-bold text-white">
          {mode === "login" ? t.loginTitle : t.registerTitle}
        </h1>
        <p className="mb-8 text-sm text-gray-400">
          {mode === "login" ? t.loginDescription : t.registerDescription}
        </p>

        {!configured ? (
          <p className="text-sm text-amber-200/90">{t.supabaseMissing}</p>
        ) : (
          <div className="flex flex-col gap-6">
            <Button
              type="button"
              variant="secondary"
              className="w-full border-white/10 bg-white/5 py-3 hover:bg-white/10"
              disabled={busy}
              onClick={() => void signInWithGoogle()}
            >
              <GoogleIcon />
              {t.continueWithGoogle}
            </Button>

            {error ? <p className="text-sm text-rose-300">{error}</p> : null}
            {message ? <p className="text-sm text-teal-200/90">{message}</p> : null}

            <div className="relative flex items-center">
              <div className="h-px flex-1 border-t border-white/5" aria-hidden />
              <span className="px-4 text-xs uppercase tracking-widest text-gray-500">{t.orContinueWithEmail}</span>
              <div className="h-px flex-1 border-t border-white/5" aria-hidden />
            </div>

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
              <label className="block space-y-2">
                <span className="text-sm font-medium text-gray-300">{t.password}</span>
                <input
                  type="password"
                  name="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  className={inputClassName}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>

              {pendingEmailVerification && mode === "register" ? (
                <div className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-xs leading-relaxed text-gray-400">{t.emailDeliveryHint}</p>
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

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-[#a78bfa] to-[#7c3aed] py-3 font-semibold text-white shadow-lg shadow-purple-500/20 hover:opacity-90"
                disabled={busy}
              >
                {busy ? "…" : mode === "login" ? t.submitLogin : t.submitRegister}
              </Button>

              <p className="text-center text-sm text-gray-400">
                {mode === "login" ? (
                  <>
                    {t.noAccount}{" "}
                    <Link href={registerHref} className="font-medium text-purple-400 hover:underline">
                      {t.registerLink}
                    </Link>
                  </>
                ) : (
                  <>
                    {t.hasAccount}{" "}
                    <Link href={loginHref} className="font-medium text-purple-400 hover:underline">
                      {t.loginLink}
                    </Link>
                  </>
                )}
              </p>
            </form>
          </div>
        )}
      </div>

      <footer className="mt-auto flex gap-6 py-8 text-xs text-gray-500">
        <Link href="#" className="hover:text-white">
          Términos
        </Link>
        <Link href="#" className="hover:text-white">
          Privacidad
        </Link>
        <Link href="#" className="hover:text-white">
          Ayuda
        </Link>
      </footer>
    </div>
  );
}
