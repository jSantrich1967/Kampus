"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authCopy } from "@/lib/i18n/auth";
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

  const showAuthBypassBanner = shouldShowAuthBypassWarning();
  const [authBypassDismissed, setAuthBypassDismissed] = useState(false);
  const [authBypassHydrated, setAuthBypassHydrated] = useState(false);

  useEffect(() => {
    setAuthBypassDismissed(loadAuthBypassBannerDismissed());
    setAuthBypassHydrated(true);
  }, []);

  const showAuthBypassUi =
    showAuthBypassBanner && authBypassHydrated && !authBypassDismissed;

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
    </div>
  );
}
