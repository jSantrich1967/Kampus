"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { Eye, EyeOff } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { useKampus } from "@/components/kampus/kampus-provider";
import { MyOrganizations } from "@/components/settings/my-organizations";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { activateDemoMode } from "@/lib/demo/activate-demo-mode";
import { authCopy } from "@/lib/i18n/auth";
import { onboardingCopy } from "@/lib/i18n/onboarding";
import type { UserRole } from "@/lib/schemas/profile";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { deleteDemoDataRemote } from "@/lib/supabase/agenda-db";
import { loadExams, saveExams } from "@/lib/storage/exams-storage";
import { isSupabaseConfigured, shouldShowAuthBypassWarning } from "@/lib/supabase/env";
import { saveScreenRole } from "@/lib/storage/screen-role-storage";
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
  const [phoneVisible, setPhoneVisible] = useState(false);
  const [billing, setBilling] = useState<{
    active: boolean;
    expiresAt: string | null;
    pending: { id: string } | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/billing/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setBilling(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Los controles de prueba (rol demo, modo prueba premium) son internos:
  // solo los ve un administrador de la app, nunca un usuario normal.
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setIsAdmin(Boolean((data as { isAdmin?: boolean }).isAdmin));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const [deletingAccount, setDeletingAccount] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function deleteAccount() {
    if (deletingAccount) return;
    setDeletingAccount(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error || "No pudimos eliminar tu cuenta.");
      try {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
      } catch {
        /* la cuenta ya no existe; la sesión cae sola */
      }
      try {
        window.localStorage.clear();
        window.sessionStorage.clear();
      } catch {
        /* almacenamiento no disponible */
      }
      router.replace("/");
      router.refresh();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "No pudimos eliminar tu cuenta.");
      setDeletingAccount(false);
    }
  }

  const [cleaningDemo, setCleaningDemo] = useState(false);
  const [cleanDemoMsg, setCleanDemoMsg] = useState<string | null>(null);

  async function resetDemoData() {
    if (cleaningDemo) return;
    setCleaningDemo(true);
    setCleanDemoMsg(null);
    try {
      let total = 0;
      if (isSupabaseConfigured() && authUserId) {
        const supabase = createSupabaseBrowserClient();
        const r = await deleteDemoDataRemote(supabase, authUserId);
        total = r.exams + r.works + r.decks;
      }
      const local = loadExams(authUserId).filter(
        (e) => !e.title.toLocaleLowerCase("es").includes("(demo)"),
      );
      saveExams(local, authUserId);
      setCleanDemoMsg(
        total > 0
          ? `Listo: borramos ${total} elementos de ejemplo de tu cuenta. Tus datos reales no se tocaron.`
          : "Tu cuenta ya no tenía datos de ejemplo.",
      );
    } catch {
      setCleanDemoMsg("No pudimos borrar los datos de ejemplo. Inténtalo de nuevo.");
    } finally {
      setCleaningDemo(false);
    }
  }

  const phoneValue = profile.phone ?? "";
  const maskedPhone = phoneValue
    ? `${phoneValue.slice(0, 3)} ••• ••• ${phoneValue.slice(-4)}`
    : "";

  useEffect(() => {
    setAuthBypassDismissed(loadAuthBypassBannerDismissed(authUserId));
    setAuthBypassHydrated(true);
  }, [authUserId]);

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
        actions={
          <Button type="button" size="sm" variant="secondary" onClick={() => router.push("/guide")}>
            Guía de Kampus
          </Button>
        }
      />

      <nav aria-label="Ir a una sección de Ajustes" className="flex flex-wrap gap-2">
        {[
          ["Cuenta", "#ajustes-cuenta"],
          ["WhatsApp", "#ajustes-whatsapp"],
          ["Materias", "#ajustes-materias"],
          ["Plan", "#ajustes-plan"],
          ["Datos de prueba", "#ajustes-datos"],
        ].map(([label, href]) => (
          <a
            key={href}
            href={href}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            {label}
          </a>
        ))}
      </nav>

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
                saveAuthBypassBannerDismissed(authUserId);
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
            clearAuthBypassBannerDismissed(authUserId);
            setAuthBypassDismissed(false);
          }}
        >
          {tAuth.authBypassBannerShowAgain}
        </button>
      ) : null}

      <Card id="ajustes-cuenta" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>{tAuth.account}</CardTitle>
          <CardDescription>
            {profileRemoteSyncActive ? tAuth.loggedInHint : tAuth.notLoggedInHint}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3">
          <div>
            <label htmlFor="profile-name" className="mb-1 block text-xs font-medium text-slate-300">
              Tu nombre
            </label>
            <input
              id="profile-name"
              type="text"
              autoComplete="name"
              placeholder="¿Cómo te llamas?"
              value={profile.displayName ?? ""}
              onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none"
            />
            <p className="mt-1 text-xs text-slate-500">
              Es el nombre que verán tus compañeros y profesores en Kampus.
            </p>
          </div>
          {!isSupabaseConfigured() ? (
            <p className="text-sm text-amber-200/90">{tAuth.supabaseMissing}</p>
          ) : authUserId ? (
            <>
              <p className="text-sm text-slate-300">{tAuth.sessionActive}</p>
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

      <MyOrganizations userId={authUserId} />

      <Card id="ajustes-whatsapp" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>Avisos por WhatsApp</CardTitle>
          <CardDescription>
            Recibe recordatorios de exámenes, exposiciones, entregas, clases virtuales, clases suspendidas y duelos en tu WhatsApp.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 px-6 pb-6">
          <div>
            <label htmlFor="wa-phone" className="mb-1 block text-xs font-medium text-slate-300">
              Tu número de WhatsApp
            </label>
            {phoneVisible || !phoneValue ? (
              <div className="flex gap-2">
                <input
                  id="wa-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="+584121234567"
                  value={phoneValue}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value.trim() })}
                  onBlur={(e) => {
                    const normalized = e.target.value.replace(/[\s\-().]/g, "");
                    const fixed =
                      normalized && !normalized.startsWith("+") ? `+${normalized}` : normalized;
                    if (fixed !== e.target.value) setProfile({ ...profile, phone: fixed });
                  }}
                  className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400/60 focus:outline-none"
                />
                {phoneValue ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setPhoneVisible(false)}
                    className="shrink-0 gap-1.5"
                  >
                    <EyeOff className="h-3.5 w-3.5" aria-hidden />
                    Ocultar
                  </Button>
                ) : null}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2">
                <span className="text-sm tabular-nums text-slate-200">{maskedPhone}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setPhoneVisible(true)}
                  className="shrink-0 gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden />
                  Ver o editar
                </Button>
              </div>
            )}
            <p className="mt-1 text-xs text-slate-500">
              Con código de país. Ej: +58 para Venezuela, +57 para Colombia.
            </p>
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <span className="text-sm text-slate-200">
              Recordarme por WhatsApp
              <span className="block text-xs text-slate-500">
                Un día antes y el mismo día de cada fecha importante.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={Boolean(profile.whatsappReminders)}
              disabled={!/^\+[1-9]\d{7,14}$/.test(profile.phone ?? "")}
              onClick={() =>
                setProfile({ ...profile, whatsappReminders: !profile.whatsappReminders })
              }
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                profile.whatsappReminders ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                  profile.whatsappReminders ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
          {!/^\+[1-9]\d{7,14}$/.test(profile.phone ?? "") && (profile.phone ?? "") !== "" ? (
            <p className="text-xs text-amber-200/90">
              Revisa el número: debe empezar con + y el código de país.
            </p>
          ) : null}
          <p className="text-xs leading-relaxed text-slate-500">
            Al activar aceptas recibir mensajes de WhatsApp de Kampus solo con avisos de tu
            propia actividad: máximo un mensaje al día (8:00 a. m.) que junta tus exámenes,
            exposiciones, entregas, clases y duelos de hoy y mañana. Sin publicidad. Puedes
            darte de baja cuando quieras apagando el interruptor o borrando tu número: la
            baja es inmediata y no recibes más mensajes.
          </p>
          {phoneValue ? (
            <div>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setProfile({ ...profile, phone: "", whatsappReminders: false });
                  setPhoneVisible(false);
                }}
              >
                Borrar mi número y darme de baja
              </Button>
            </div>
          ) : null}
        </div>
      </Card>


      {isAdmin ? (
      <Card>
        <CardHeader>
          <CardTitle>Rol (demo)</CardTitle>
          <CardDescription>
            Cambia las pantallas de esta computadora: “Hoy”, el menú y rutas como <span className="font-mono text-slate-400">/teaching</span>. No da permiso para generar exámenes ni para ver datos de otras personas.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap gap-2">
          {roleOptions.map(({ value, label }) => (
            <Button
              key={value}
              type="button"
              size="sm"
              variant={profile.role === value ? "secondary" : "ghost"}
              onClick={() => {
                saveScreenRole(value, authUserId);
                setProfile({ ...profile, role: value });
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      </Card>
      ) : null}

      <Card id="ajustes-materias" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>Materias</CardTitle>
          <CardDescription>
            Agrega o elimina materias del perfil. Esto controla las sugerencias que ves en “Mis cuadernos”, calendario y formularios. Si quitas una materia, tus cuadernos, clases y exámenes de esa materia no se borran: quedan guardados, pero dejan de contar en tu plan, tus sugerencias y tus avisos.
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

      {isAdmin ? (
      <Card>
        <CardHeader>
          <CardTitle>Modo prueba completo</CardTitle>
          <CardDescription>
            Carga un perfil demo con materias, exámenes, racha de estudio y plan{" "}
            <span className="font-medium text-indigo-200">Premium</span> en un clic. Úsalo para recorrer kits
            completos, Modo aprobar y el simulador de profesor.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={() => {
              const demo = activateDemoMode({ premium: true });
              setProfile(demo);
              router.push("/today");
            }}
          >
            Activar modo prueba premium
          </Button>
          {profile.plan === "premium" ? (
            <Badge tone="success">Premium activo</Badge>
          ) : (
            <span className="text-xs text-slate-500">Ahora: plan Gratis</span>
          )}
        </div>
      </Card>
      ) : null}

      <Card id="ajustes-plan" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>Tu plan</CardTitle>
          <CardDescription>
            {profile.plan === "premium"
              ? billing?.expiresAt
                ? `Eres Pro hasta el ${new Date(billing.expiresAt).toLocaleDateString("es-VE", { day: "numeric", month: "long", year: "numeric" })}. Sin renovación automática: al vencer vuelves a Estudiante sin perder nada.`
                : "Eres Pro. Sin renovación automática: al vencer tu periodo vuelves a Estudiante sin perder nada."
              : billing?.pending
                ? "Recibimos tu pago y lo estamos verificando. Te activamos en menos de 24 horas."
                : "Estás en el plan Estudiante (gratis). Pro cuesta $10,30 al mes por Pago Móvil o Zelle."}
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3 px-6 pb-6">
          {profile.plan === "premium" ? (
            <Badge tone="success">Pro activo</Badge>
          ) : (
            <Badge tone="neutral">Estudiante</Badge>
          )}
          <Button type="button" size="sm" onClick={() => router.push("/pro")}>
            {profile.plan === "premium" ? "Extender mi Pro" : "Pasarme a Pro"}
          </Button>
        </div>
      </Card>

      <Card id="ajustes-datos" className="scroll-mt-28">
        <CardHeader>
          <CardTitle>Datos de prueba</CardTitle>
          <CardDescription>
            Si tu cuenta trae exámenes o trabajos de ejemplo (los que dicen «demo»), bórralos aquí.
            Tus datos reales no se tocan.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-wrap items-center gap-3 px-6 pb-6">
          <Button type="button" size="sm" variant="secondary" disabled={cleaningDemo} onClick={() => void resetDemoData()}>
            {cleaningDemo ? "Borrando…" : "Restablecer datos de prueba"}
          </Button>
          {cleanDemoMsg ? <span className="text-sm text-slate-300">{cleanDemoMsg}</span> : null}
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

      <Card className="border-rose-400/20">
        <CardHeader>
          <CardTitle>Eliminar mi cuenta</CardTitle>
          <CardDescription>
            Borra tu cuenta, tu perfil y tus datos de estudio de Kampus. No se puede deshacer.
            Los registros mínimos de pagos ya hechos se conservan por control contable, sin tu
            perfil.
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col gap-3 px-6 pb-6">
          {deleteError ? <p role="alert" className="text-sm text-rose-300">{deleteError}</p> : null}
          {confirmingDelete ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-300">¿Seguro? Se borra todo tu Kampus.</span>
              <Button type="button" size="sm" variant="secondary" disabled={deletingAccount} onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </Button>
              <Button type="button" size="sm" disabled={deletingAccount} onClick={() => void deleteAccount()}>
                {deletingAccount ? "Eliminando…" : "Sí, eliminar mi cuenta"}
              </Button>
            </div>
          ) : (
            <div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmingDelete(true)}>
                Eliminar mi cuenta
              </Button>
            </div>
          )}
        </div>
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
