"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonClasses, Button } from "@/components/ui/button";
import { MasteryPanel } from "@/components/reviews/mastery-panel";

type DueItem = { id: string; subject: string; topic: string; front: string; back: string };

type Status =
  | "loading"
  | "empty"
  | "ready"
  | "starting"
  | "session"
  | "done"
  | "blocked";

const SESSION_KEY = "kampus.reviewSession.v1";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const GRADE_BUTTONS = [
  { label: "No me la sabía", quality: 1, variant: "danger" as const },
  { label: "Dudé", quality: 3, variant: "secondary" as const },
  { label: "La sabía", quality: 5, variant: "primary" as const },
];

/**
 * Sesión de repaso con repetición espaciada (SM-2).
 * Gating: 1 sesión gratis al día (hasta 20 tarjetas); Pro ilimitado.
 * La sesión se abre en el servidor (POST /api/reviews/session); la
 * calificación es matemática local sin IA.
 */
export function ReviewSession() {
  const { authUserId } = useKampus();
  const [status, setStatus] = useState<Status>("loading");
  const [items, setItems] = useState<DueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [blockMessage, setBlockMessage] = useState("");
  const [gradedCount, setGradedCount] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pendingQuality, setPendingQuality] = useState<number | null>(null);
  const [blockCode, setBlockCode] = useState<string | null>(null);
  const startedRef = useRef(false);

  const loadDue = useCallback(async () => {
    setStatus("loading");
    try {
      const res = await fetch("/api/reviews/due");
      if (!res.ok) throw new Error("fetch");
      const json = (await res.json()) as { items?: DueItem[] };
      const list = Array.isArray(json.items) ? json.items : [];
      setItems(list);
      setStatus(list.length === 0 ? "empty" : "ready");
    } catch {
      setItems([]);
      setStatus("empty");
    }
  }, []);

  useEffect(() => {
    if (!authUserId) return;
    if (startedRef.current) return;
    startedRef.current = true;
    void loadDue();
  }, [authUserId, loadDue]);

  const startSession = useCallback(async () => {
    setStatus("starting");
    try {
      const res = await fetch("/api/reviews/session", { method: "POST" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        code?: string;
        sessionId?: string;
        items?: DueItem[];
      };
      if (!res.ok || !json.sessionId) {
        setBlockCode(json.code ?? "OPEN_FAILED");
        setBlockMessage(
          json.error || "No se pudo abrir la sesión de repaso. Inténtalo de nuevo.",
        );
        setStatus("blocked");
        return;
      }
      setSessionId(json.sessionId);
      if (Array.isArray(json.items)) setItems(json.items);
      try {
        window.localStorage.setItem(SESSION_KEY, todayKey());
      } catch {
        // sin almacenamiento: la sesión sigue válida en el servidor
      }
      setIndex(0);
      setRevealed(false);
      setStatus("session");
    } catch {
      setBlockMessage("No se pudo abrir la sesión de repaso. Revisa tu conexión.");
      setStatus("blocked");
    }
  }, []);

  const grade = useCallback(
    async (quality: number) => {
      const item = items[index];
      if (!item || !sessionId) return;
      setPendingQuality(quality);
      // El mismo token en un reintento no vuelve a aplicar SM-2.
      try {
        const res = await fetch("/api/reviews/grade", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            item_id: item.id,
            quality,
            session_id: sessionId,
            grade_token: `${sessionId}:${item.id}`,
          }),
        });
        if (!res.ok) {
          setBlockCode("SAVE_FAILED");
          setBlockMessage("No se guardó la calificación. Puedes reintentar: si el servidor ya la guardó, no se duplica.");
          setStatus("blocked");
          return;
        }
      } catch {
        setBlockCode("SAVE_FAILED");
        setBlockMessage("No se guardó la calificación. Revisa tu conexión y reintenta.");
        setStatus("blocked");
        return;
      }
      setPendingQuality(null);
      setGradedCount((n) => n + 1);
      if (index + 1 >= items.length) {
        setStatus("done");
      } else {
        setIndex((i) => i + 1);
        setRevealed(false);
      }
    },
    [index, items, sessionId],
  );

  if (!authUserId) {
    return <div className="text-sm text-slate-400">Inicia sesión para repasar.</div>;
  }

  return (
    <div className="space-y-8">
      {status === "loading" || status === "starting" ? (
        <div className="text-sm text-slate-400">
          {status === "loading" ? "Buscando tus repasos…" : "Abriendo tu sesión…"}
        </div>
      ) : null}

      {status === "empty" ? (
        <Card>
          <CardHeader>
            <CardTitle>No tienes repasos pendientes</CardTitle>
            <CardDescription>
              Genera un kit con Estudiar con IA y sus tarjetas aparecerán aquí para
              repasarlas justo cuando las vayas a olvidar.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            <Link href="/study/library/rescue" className={buttonClasses({ size: "sm" })}>
              Estudiar con IA
            </Link>
            <Link href="/modo-examen" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Hacer un diagnóstico
            </Link>
          </div>
        </Card>
      ) : null}

      {status === "ready" ? (
        <Card>
          <CardHeader>
            <CardTitle>
              Tienes {items.length} {items.length === 1 ? "repaso pendiente" : "repasos pendientes"}
            </CardTitle>
            <CardDescription>
              Sesión de unos minutos: mira la tarjeta, intenta recordar, revela y califica
              con honestidad. Así decides cuándo vuelve a aparecer.
            </CardDescription>
          </CardHeader>
          <div className="px-5 pb-5">
            <Button size="sm" onClick={startSession}>
              Empezar sesión de repaso
            </Button>
            <p className="mt-2 text-xs text-slate-500">
              Plan gratis: 1 sesión al día. Con Pro, sesiones ilimitadas.
            </p>
          </div>
        </Card>
      ) : null}

      {status === "blocked" ? (
        <Card>
          <CardHeader>
            <CardTitle>Sesión no disponible</CardTitle>
            <CardDescription>{blockMessage}</CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            {blockCode === "SAVE_FAILED" && pendingQuality !== null ? (
              <Button size="sm" onClick={() => void grade(pendingQuality)}>
                Reintentar guardado
              </Button>
            ) : (
              <Link href="/pro" className={buttonClasses({ size: "sm" })}>
                Pasarme a Pro
              </Link>
            )}
            <Link href="/today" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Volver a Hoy
            </Link>
          </div>
        </Card>
      ) : null}

      {status === "session" && items[index] ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm text-slate-400">
            <span>
              Tarjeta {index + 1} de {items.length}
            </span>
            <span className="text-xs">
              {items[index]!.subject} · {items[index]!.topic}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-violet-400 transition-all"
              style={{ width: `${((index + 1) / items.length) * 100}%` }}
            />
          </div>
          <Card>
            <div className="px-5 pb-5">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {revealed ? "Respuesta" : "Pregunta"}
              </p>
              <p className="mt-2 text-lg font-medium text-slate-50">
                {revealed ? items[index]!.back : items[index]!.front}
              </p>
              {!revealed ? (
                <div className="mt-6">
                  <Button onClick={() => setRevealed(true)}>Revelar respuesta</Button>
                </div>
              ) : (
                <div className="mt-6">
                  <p className="mb-3 text-sm text-slate-400">
                    ¿Qué tan bien la recordabas? Sé honesto: de eso depende cuándo vuelve.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GRADE_BUTTONS.map((b) => (
                      <Button key={b.quality} variant={b.variant} onClick={() => grade(b.quality)}>
                        {b.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      ) : null}

      {status === "done" ? (
        <Card>
          <CardHeader>
            <CardTitle>¡Sesión completa!</CardTitle>
            <CardDescription>
              Repasaste {gradedCount} {gradedCount === 1 ? "tarjeta" : "tarjetas"}. Las que
              dudaste volverán pronto; las que sabías, más adelante.
            </CardDescription>
          </CardHeader>
          <div className="flex flex-wrap gap-2 px-5 pb-5">
            <Link href="/today" className={buttonClasses({ size: "sm", variant: "secondary" })}>
              Volver a Hoy
            </Link>
          </div>
        </Card>
      ) : null}

      <MasteryPanel />
    </div>
  );
}
