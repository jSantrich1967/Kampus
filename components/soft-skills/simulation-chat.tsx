"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AiErrorNotice } from "@/components/ui/ai-error";
import { aiErrorMessage } from "@/lib/with-timeout";
import type { Simulation } from "@/lib/soft-skills/content";

type ChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Simulación de práctica con IA: el Tutor interpreta el rol del escenario
 * (profesor que escucha la exposición / compañero que no cumplió) usando el
 * contexto de rol de la simulación. La conversación no se persiste: es una
 * práctica, lo que queda guardado es su culminación.
 */
export function SimulationChat({
  simulation,
  completed,
  onComplete,
}: {
  simulation: Simulation;
  completed: boolean;
  onComplete: () => void;
}) {
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasteOver, setTasteOver] = useState(false);
  const busyRef = useRef(false);

  const userTurns = messages.filter((m) => m.role === "user").length;
  const canComplete = userTurns >= 3 && !completed;

  const start = () => {
    setStarted(true);
    setMessages([{ role: "assistant", content: simulation.opening }]);
  };

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || busyRef.current) return;
    busyRef.current = true;
    setError(null);
    setBusy(true);
    const nextHistory: ChatTurn[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextHistory);
    setDraft("");
    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextHistory,
          subject: "Comunicación efectiva",
          level: "university",
          notebookContext: simulation.tutorContext,
        }),
        signal: AbortSignal.timeout(90_000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        code?: string;
      };
      if (!res.ok && data.code === "TASTE_EXHAUSTED") {
        setTasteOver(true);
        setMessages((prev) => prev.slice(0, -1));
        setDraft(trimmed);
        return;
      }
      if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
      const reply = (data.reply ?? "").trim();
      if (!reply) throw new Error("Respuesta vacía");
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (e) {
      setError(aiErrorMessage(e, "No se pudo continuar la simulación."));
      setMessages((prev) => prev.slice(0, -1));
      setDraft(trimmed);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  if (!started) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-300">{simulation.scenario}</p>
        <ul className="space-y-1 text-sm text-slate-400">
          {simulation.rubric.map((r) => (
            <li key={r}>• Te evaluará por: {r}</li>
          ))}
        </ul>
        {completed ? (
          <p className="inline-flex items-center gap-2 text-sm text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden /> Simulación completada. Puedes repetirla cuando quieras.
          </p>
        ) : null}
        <div>
          <Button type="button" onClick={start}>
            {completed ? "Practicar de nuevo" : "Empezar la simulación"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-xl bg-purple-500/15 px-3.5 py-2.5 text-sm text-slate-100"
                : "mr-auto max-w-[85%] rounded-xl bg-white/5 px-3.5 py-2.5 text-sm text-slate-200"
            }
          >
            {m.content}
          </div>
        ))}
        {busy ? <p className="text-xs text-slate-400">Pensando…</p> : null}
      </div>

      {tasteOver ? (
        <div className="rounded-xl border border-purple-400/25 bg-purple-500/[0.06] px-4 py-3 text-sm text-slate-200">
          Ya usaste tu probada gratis de hoy del Tutor IA. Con Pro practicas sin ese límite.{" "}
          <Link href="/pro" className="font-medium text-purple-200 underline underline-offset-2">
            Pasarme a Pro por $5/mes
          </Link>
        </div>
      ) : null}

      {error ? (
        <AiErrorNotice message={error} onRetry={draft.trim() ? () => void send(draft) : undefined} retrying={busy} />
      ) : null}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Escribe tu respuesta…"
          className="min-h-[44px] flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400/40"
          aria-label="Tu respuesta en la simulación"
        />
        <Button type="submit" disabled={busy || !draft.trim()} aria-label="Enviar">
          <Send className="h-4 w-4" aria-hidden />
        </Button>
      </form>

      {canComplete ? (
        <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/[0.06] px-4 py-3">
          <p className="text-sm text-slate-200">
            Ya practicaste el intercambio completo. Si recibiste tu retroalimentación, marca la simulación como
            completada.
          </p>
          <Button type="button" className="mt-2" onClick={onComplete}>
            Marcar como completada
          </Button>
        </div>
      ) : completed ? (
        <p className="inline-flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="h-4 w-4" aria-hidden /> Simulación completada
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Completa al menos 3 intervenciones tuyas: la retroalimentación llega en el tercer intercambio.
        </p>
      )}
    </div>
  );
}
