"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authCopy } from "@/lib/i18n/auth";
import { onboardingCopy } from "@/lib/i18n/onboarding";
import type { UserRole } from "@/lib/schemas/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured, shouldShowAuthBypassWarning } from "@/lib/supabase/env";
import {
  clearAuthBypassBannerDismissed,
  loadAuthBypassBannerDismissed,
  saveAuthBypassBannerDismissed,
} from "@/lib/storage/auth-bypass-banner-storage";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, setProfile, authUserId, profileRemoteSyncActive } = useKampus();
  const tAuth = authCopy.es;
  const tOnboarding = onboardingCopy.es;

  const roleOptions: { value: UserRole; label: string }[] = [
    { value: "student", label: tOnboarding.roles.student },
    { value: "teacher", label: tOnboarding.roles.teacher },
    { value: "learner", label: tOnboarding.roles.learner },
    { value: "institution", label: tOnboarding.roles.institution },
  ];

  const enableSentryTest = process.env.NEXT_PUBLIC_ENABLE_SENTRY_TEST === "true";
  const [sentryTestStatus, setSentryTestStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  const showAuthBypassBanner = shouldShowAuthBypassWarning();
  const [authBypassDismissed, setAuthBypassDismissed] = useState(false);
  const [authBypassHydrated, setAuthBypassHydrated] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");

  useEffect(() => {
    setAuthBypassDismissed(loadAuthBypassBannerDismissed());
    setAuthBypassHydrated(true);
  }, []);

  const showAuthBypassUi =
    showAuthBypassBanner && authBypassHydrated && !authBypassDismissed;

  const subjects = profile.subjects ?? [];
  const canRemoveSubject = subjects.length > 1;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Sistema"
        title="Ajustes"
        description="Controla plan, cuenta en la nube y reinicio del onboarding."
      />

      {showAuthBypassUi ? (
        <div
          role="status"
          className="rounded-2xl border border-amber-300/25 bg-amber-400/10 px-4 py-3 text-sm text-amber-50"
        >
          <div className="font-semibold text-amber-100">{tAuth.authBypassBannerTitle}</div>
          <p className="mt-1 text-amber-100/90">{tAuth.authBypassBannerBody}</p>
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="border-amber-400/30 bg-amber-950/40 text-amber-50 hover:bg-amber-950/60"
              onClick={() => {
                saveAuthBypassBannerDismissed();
                setAuthBypassDismissed(true);
              }}
            >
              {tAuth.authBypassBannerDismiss}
            </Button>
          </div>
        </div>
      ) : null}

      {showAuthBypassBanner && authBypassHydrated && authBypassDismissed ? (
        <button
          type="button"
          className="text-left text-xs text-slate-500 underline decoration-slate-600 underline-offset-2 hover:text-slate-400"
          onClick={() => {
            clearAuthBypassBannerDismissed();
            setAuthBypassDismissed(false);
          }}
        >
          {tAuth.authBypassBannerShowAgain}
        </button>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{tAuth.account}</CardTitle>
          <CardDescription>
            {profileRemoteSyncActive ? tAuth.loggedInHint : tAuth.notLoggedInHint}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3">
          {!isSupabaseConfigured() ? (
            <p className="text-sm text-amber-200/90">{tAuth.supabaseMissing}</p>
          ) : authUserId ? (
            <>
              <p className="text-sm text-slate-300">{tAuth.sessionActive}</p>
              <p className="break-all font-mono text-xs text-slate-500">
                <span className="text-slate-400">{tAuth.userId}: </span>
                {authUserId}
              </p>
              <Button
                type="button"
                variant="secondary"
                onClick={async () => {
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  router.refresh();
                }}
              >
                {tAuth.signOut}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400">{tAuth.notLoggedIn}</p>
              <Button type="button" onClick={() => router.push("/login")}>
                {tAuth.goLogin}
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Idioma</CardTitle>
          <CardDescription>La app está configurada solo en español.</CardDescription>
        </CardHeader>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setProfile({ ...profile, preferredLanguage: "es" })}
          >
            ES
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rol (demo)</CardTitle>
          <CardDescription>
            Prueba la app como docente u otros perfiles sin repetir el onboarding. Afecta “Hoy”, el menú y rutas como{" "}
            <span className="font-mono text-slate-400">/teaching</span>.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={profile.role === value ? "secondary" : "ghost"}
              onClick={() => setProfile({ ...profile, role: value })}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Materias</CardTitle>
          <CardDescription>
            Agrega o elimina materias del perfil. Esto controla las sugerencias que ves en “Mis cuadernos”, calendario y formularios.
          </CardDescription>
        </CardHeader>

        <div className="space-y-3 px-6 pb-6">
          <div className="flex flex-wrap gap-2">
            {subjects.map((s) => (
              <Badge key={s} tone="neutral" className="inline-flex items-center gap-2">
                <span className="max-w-[16rem] truncate">{s}</span>
                <button
                  type="button"
                  className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px] text-slate-200 hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!canRemoveSubject}
                  aria-label={`Eliminar materia ${s}`}
                  onClick={() => {
                    if (!canRemoveSubject) return;
                    setProfile({
                      ...profile,
                      subjects: subjects.filter((x) => x !== s),
                      upcomingExams: (profile.upcomingExams ?? []).filter((e) => e.subject !== s),
                    });
                  }}
                >
                  Quitar
                </button>
              </Badge>
            ))}
          </div>

          {!canRemoveSubject ? (
            <p className="text-xs text-slate-500">Debes conservar al menos 1 materia en el perfil.</p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="flex-1 space-y-1 text-sm">
              <span className="text-slate-400">Agregar materia</span>
              <input
                className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                placeholder="Ej. Econometría"
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  const next = subjectDraft.trim();
                  if (!next) return;
                  e.preventDefault();
                  setProfile({ ...profile, subjects: Array.from(new Set([...subjects, next])) });
                  setSubjectDraft("");
                }}
              />
            </label>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const next = subjectDraft.trim();
                if (!next) return;
                setProfile({ ...profile, subjects: Array.from(new Set([...subjects, next])) });
                setSubjectDraft("");
              }}
            >
              Agregar
            </Button>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan (demo)</CardTitle>
          <CardDescription>Simula el acceso Premium vs Gratis.</CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant={profile.plan === "free" ? "secondary" : "ghost"} onClick={() => setProfile({ ...profile, plan: "free" })}>
            Gratis
          </Button>
          <Button type="button" size="sm" variant={profile.plan === "premium" ? "secondary" : "ghost"} onClick={() => setProfile({ ...profile, plan: "premium" })}>
            Premium
          </Button>
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rehacer onboarding</CardTitle>
          <CardDescription>Vuelve al asistente inicial.</CardDescription>
        </CardHeader>
        <Button
          type="button"
          variant="danger"
          onClick={() => {
            setProfile({
              ...profile,
              onboardingFinished: false,
            });
            router.push("/onboarding");
          }}
        >
          Reiniciar
        </Button>
      </Card>

      {enableSentryTest ? (
        <Card>
          <CardHeader>
            <CardTitle>Sentry (verificación)</CardTitle>
            <CardDescription>
              Botón de prueba para enviar el primer error a Sentry. Solo aparece si defines{" "}
              <span className="font-mono text-xs text-slate-300">NEXT_PUBLIC_ENABLE_SENTRY_TEST=true</span>.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={sentryTestStatus === "sending"}
              onClick={async () => {
                setSentryTestStatus("sending");
                try {
                  Sentry.captureException(new Error("Sentry test: Settings button"));
                  // Espera un poco para asegurar envío desde el navegador.
                  await Sentry.flush(2000);
                  setSentryTestStatus("sent");
                } catch {
                  setSentryTestStatus("error");
                }
              }}
            >
              {sentryTestStatus === "sending" ? "Enviando…" : "Probar Sentry"}
            </Button>
            {sentryTestStatus === "sent" ? (
              <p className="text-sm text-emerald-200/90">
                Enviado. Revisa Sentry → Issues en ~30–90s.
              </p>
            ) : sentryTestStatus === "error" ? (
              <p className="text-sm text-rose-200/90">
                No pudimos enviar el evento. Prueba sin adblock o en otra red.
              </p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
