"use client";

import { Loader2, MessageCircle, Mic, MicOff, RotateCcw, Send, Volume2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { WellbeingSubnav } from "@/components/wellbeing/wellbeing-subnav";
import { WellbeingHumanSupportPanel } from "@/components/wellbeing/wellbeing-human-support-panel";
import { useDiaryInsights } from "@/hooks/use-diary-insights";
import { useKampus } from "@/components/kampus/kampus-provider";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import {
  clearPsychologistChatEverywhere,
  persistPsychologistChatToCloud,
} from "@/lib/wellbeing/psychologist-chat-sync";
import { usePsychologistChatSync } from "@/hooks/use-psychologist-chat-sync";
import { wellbeingCopy } from "@/lib/i18n/wellbeing";
import { loadDiaryEntries } from "@/lib/storage/diary-storage";
import {
  clearPsychologistChatStorage,
  savePsychologistChat,
} from "@/lib/storage/psychologist-chat-storage";
import { buildExamStressPrompt } from "@/lib/wellbeing/psychologist-path";
import { buildPsychologistContextBlock } from "@/lib/wellbeing/psychologist-context";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";

type ChatTurn = { role: "user" | "assistant"; content: string };

const STORAGE_KEY = "kampus.psychologist.disclaimerAccepted.v1";

const WORKFLOW_STEPS = [
  {
    title: "Acogida",
    body: "Saludo calmado y espacio sin juicios para que cuentes lo que te pesa, a tu ritmo.",
  },
  {
    title: "Escucha y contexto",
    body: "Preguntas abiertas sobre estudio, sueño, relaciones o estrés — sin interrogatorio.",
  },
  {
    title: "Validación",
    body: "Lo que sientes tiene sentido; muchas personas en la etapa estudiantil pasan por algo parecido.",
  },
  {
    title: "Psicoeducación breve",
    body: "Ideas sencillas (ansiedad, evitación, rumiación, procrastinación) cuando encajen con tu caso.",
  },
  {
    title: "Estrategias prácticas",
    body: "Herramientas concretas: respiración, anclaje 5-4-3-2-1, micro-objetivos, pausas, pedir ayuda.",
  },
  {
    title: "Cierre",
    body: "Resumen corto, un siguiente paso pequeño y recordatorio de que el apoyo profesional existe si lo necesitas.",
  },
];

function loadDisclaimerAccepted(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function saveDisclaimerAccepted(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(STORAGE_KEY, "1");
  else window.localStorage.removeItem(STORAGE_KEY);
}

type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  onresult: ((ev: { results: ArrayLike<{ 0?: { transcript?: string } }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition;

function getSpeechRecognition(): BrowserSpeechRecognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: BrowserSpeechRecognitionCtor;
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor;
  };
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) return null;
  return new Ctor();
}

function pickRecorderMime(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported("audio/webm")) return "audio/webm";
  return undefined;
}

export function PsychologistHub() {
  const wb = wellbeingCopy.es;
  const { authUserId } = useKampus();
  const useCloud = Boolean(isSupabaseConfigured() && authUserId);
  const searchParams = useSearchParams();
  const { insights } = useDiaryInsights();
  const { refresh: syncChat, cloudSynced } = usePsychologistChatSync();

  const examSubject = searchParams.get("subject")?.trim() ?? "";
  const examDaysRaw = searchParams.get("days");
  const examDays = examDaysRaw !== null && examDaysRaw !== "" ? Number.parseInt(examDaysRaw, 10) : undefined;
  const promptParam = searchParams.get("prompt")?.trim() ?? "";

  const suggestedPrompt = useMemo(() => {
    if (promptParam) return promptParam;
    if (examSubject && examDays !== undefined && !Number.isNaN(examDays)) {
      return buildExamStressPrompt(examSubject, examDays);
    }
    return null;
  }, [promptParam, examSubject, examDays]);

  const contextBlock = useMemo(
    () =>
      buildPsychologistContextBlock({
        examSubject: examSubject || undefined,
        examDays: examDays !== undefined && !Number.isNaN(examDays) ? examDays : undefined,
        insights,
        entries: loadDiaryEntries(),
      }),
    [examSubject, examDays, insights],
  );

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [browserListen, setBrowserListen] = useState(false);
  const [mediaRecording, setMediaRecording] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [chatRestored, setChatRestored] = useState(false);
  const [quotaUsed, setQuotaUsed] = useState<number | null>(null);
  const [quotaLimit, setQuotaLimit] = useState<number | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const chatOwnerRef = useRef<string | null>(authUserId);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  useEffect(() => {
    setHydrated(true);
    setDisclaimerAccepted(loadDisclaimerAccepted());
    void syncChat().then((restored) => {
      if (restored.length > 0) {
        setMessages(restored);
        setChatRestored(true);
        window.setTimeout(() => setChatRestored(false), 6000);
      }
    });
  }, [syncChat]);

  useEffect(() => {
    if (!hydrated) return;
    if (chatOwnerRef.current !== authUserId) {
      chatOwnerRef.current = authUserId;
      setMessages([]);
      return;
    }
    if (messages.length > 0) savePsychologistChat(authUserId, messages);
  }, [messages, hydrated, authUserId]);

  useEffect(() => {
    if (!suggestedPrompt || input.trim()) return;
    setInput(suggestedPrompt);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prefill once from URL
  }, [suggestedPrompt]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, busy]);

  const onToggleDisclaimer = (checked: boolean) => {
    setDisclaimerAccepted(checked);
    saveDisclaimerAccepted(checked);
  };

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !disclaimerAccepted || busy) return;

      setError(null);
      setBusy(true);
      const nextHistory: ChatTurn[] = [...messages, { role: "user", content: trimmed }];

      setMessages(nextHistory);
      setInput("");

      try {
        const res = await fetch("/api/wellbeing/psychologist/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: nextHistory,
            context: contextBlock.trim() || undefined,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          reply?: string;
          error?: string;
          quota?: { used: number; limit: number };
        };
        if (!res.ok) {
          if (res.status === 429) {
            throw new Error(data.error || wb.psychologistQuotaExceeded);
          }
          throw new Error(data.error || `Error ${res.status}`);
        }
        const reply = (data.reply ?? "").trim();
        if (!reply) throw new Error("Respuesta vacía.");
        if (data.quota) {
          setQuotaUsed(data.quota.used);
          setQuotaLimit(data.quota.limit);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
        if (useCloud && authUserId) {
          const supabase = createSupabaseBrowserClient();
          void persistPsychologistChatToCloud(supabase, authUserId, [
            ...nextHistory,
            { role: "assistant", content: reply },
          ]);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "No se pudo enviar el mensaje.";
        setError(msg);
        setMessages((prev) => prev.slice(0, -1));
        setInput(trimmed);
      } finally {
        setBusy(false);
      }
    },
    [messages, disclaimerAccepted, busy, contextBlock, wb.psychologistQuotaExceeded, useCloud, authUserId],
  );

  const startBrowserDictation = useCallback(() => {
    const rec = getSpeechRecognition();
    if (!rec) {
      setError("Tu navegador no ofrece dictado por voz integrado. Prueba Chrome o usa «Grabar voz».");
      return;
    }
    setError(null);
    rec.lang = "es-ES";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (ev) => {
      const t = Array.from(ev.results)
        .map((r) => (r[0]?.transcript ? String(r[0].transcript) : ""))
        .join(" ")
        .trim();
      if (t) setInput((prev) => (prev ? `${prev.trim()} ${t}` : t));
    };
    rec.onerror = () => {
      setBrowserListen(false);
    };
    rec.onend = () => setBrowserListen(false);
    setBrowserListen(true);
    rec.start();
  }, []);

  const stopMediaRecording = useCallback(async () => {
    const mr = recRef.current;
    if (!mr || mr.state === "inactive") {
      setMediaRecording(false);
      return;
    }
    mr.stop();
  }, []);

  const startMediaRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mime = pickRecorderMime();
      const mr = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      recRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setMediaRecording(false);
        recRef.current = null;
        const blob = new Blob(chunksRef.current, { type: mime ?? "audio/webm" });
        if (blob.size < 500) return;
        const fd = new FormData();
        fd.append("file", blob, "habla.webm");
        try {
          const res = await fetch("/api/presentation/transcribe", { method: "POST", body: fd });
          const data = (await res.json().catch(() => ({}))) as { transcript?: string; error?: string };
          if (!res.ok) throw new Error(data.error || "Transcripción fallida.");
          const t = (data.transcript ?? "").trim();
          if (t) setInput((prev) => (prev ? `${prev.trim()} ${t}` : t));
        } catch (e) {
          setError(e instanceof Error ? e.message : "No se pudo transcribir el audio.");
        }
      };
      mr.start(200);
      setMediaRecording(true);
    } catch {
      setError("No se pudo acceder al micrófono. Revisa permisos del navegador.");
    }
  }, []);

  const speakLastAssistant = useCallback(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last?.content || typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(last.content);
    u.lang = "es-ES";
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, [messages]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setInput("");
    setError(null);
    if (useCloud && authUserId) {
      const supabase = createSupabaseBrowserClient();
      void clearPsychologistChatEverywhere(supabase, authUserId);
    } else {
      clearPsychologistChatStorage(authUserId);
    }
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, [useCloud, authUserId]);

  if (!hydrated) {
    return <div className="text-sm text-slate-400">Cargando…</div>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={wb.psychologistEyebrow}
        title={wb.psychologistTitle}
        description={wb.psychologistDescription}
        actions={
          <Button type="button" variant="secondary" size="sm" onClick={resetChat} disabled={busy || messages.length === 0}>
            <RotateCcw className="h-3.5 w-3.5" />
            Nueva conversación
          </Button>
        }
      />

      <WellbeingSubnav />

      {chatRestored ? (
        <p className="rounded-xl border border-indigo-400/25 bg-indigo-950/30 px-4 py-3 text-sm text-indigo-100">
          {wb.psychologistChatRestored}
        </p>
      ) : null}

      {useCloud && cloudSynced ? (
        <p className="rounded-xl border border-emerald-400/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100">
          {wb.psychologistChatCloudSynced}
        </p>
      ) : null}

      {examSubject && examDays !== undefined && !Number.isNaN(examDays) ? (
        <Card className="border-violet-400/25 bg-violet-500/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{wb.psychologistExamBanner(examSubject, examDays)}</CardTitle>
            {suggestedPrompt ? (
              <CardDescription>{wb.psychologistSuggestedPrompt}</CardDescription>
            ) : null}
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-rose-500/25 bg-rose-950/15">
        <CardHeader>
          <CardTitle className="text-rose-100">Si estás en peligro o con ideas de hacerte daño</CardTitle>
          <CardDescription className="text-rose-100/85">
            Esta app no puede intervenir en una crisis. Busca ayuda humana ya: en Venezuela llama al{" "}
            <strong className="text-white">171</strong> (emergencias) o al{" "}
            <strong className="text-white">0800-2586867</strong> (línea Siempre Juntos — apoyo emocional gratuito). También
            LAPSI FPV: <strong className="text-white">0424-2907338</strong> (vie–dom). Cuéntaselo a un adulto de confianza.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-indigo-300" aria-hidden />
            Avisos importantes (léelos antes de usar el chat)
          </CardTitle>
          <CardDescription className="space-y-3 text-slate-300">
            <p>
              <strong className="text-white">Esto no es un psicólogo real.</strong> Es un modelo de lenguaje (ChatGPT / OpenAI en el
              servidor) que genera texto de apoyo general. No hay vínculo terapéutico, no hay evaluación clínica ni seguimiento
              profesional obligatorio.
            </p>
            <p>
              <strong className="text-white">No diagnostic ni trates problemas graves solo con este chat.</strong> Si el malestar es
              intenso, duradero o afecta mucho a tu vida, busca un psicólogo colegiado o servicios de salud mental de tu centro o
              país.
            </p>
            <p>
              <strong className="text-white">Privacidad:</strong> los mensajes se envían a nuestro servidor y de ahí a OpenAI para
              generar la respuesta. No compartas datos muy personales que no quieras que queden en esos registros según las políticas
              del proveedor.
            </p>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-slate-950/40 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-white/20 bg-slate-900"
                checked={disclaimerAccepted}
                onChange={(e) => onToggleDisclaimer(e.target.checked)}
              />
              <span>
                Entiendo que esto es <strong className="text-white">apoyo informativo/emocional</strong>, no terapia, y que en crisis
                debo contactar servicios de emergencia o líneas de ayuda humanas.
              </span>
            </label>
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cómo acompaña este espacio (flujo de trabajo)</CardTitle>
          <CardDescription className="text-slate-300">
            Inspirado en buenas prácticas de psicoeducación y primeros auxilios emocionales — aplicado por IA, con las limitaciones
            que eso conlleva.
          </CardDescription>
        </CardHeader>
        <ol className="list-none space-y-3 px-5 pb-5">
          {WORKFLOW_STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3 rounded-xl border border-white/5 bg-slate-950/30 px-3 py-2.5 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-200">
                {i + 1}
              </span>
              <div>
                <div className="font-medium text-slate-100">{step.title}</div>
                <p className="mt-0.5 text-slate-400">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card className="p-0">
        <CardHeader className="border-b border-white/5 px-5 pb-4 pt-5">
          <CardTitle>Chat</CardTitle>
          <CardDescription>
            Escribe o usa el micrófono. La voz puede usar el dictado del navegador o una grabación transcrita por OpenAI (como en
            ensayos de exposición).
          </CardDescription>
        </CardHeader>

        <div className="max-h-[min(420px,50vh)] space-y-3 overflow-y-auto px-5 py-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              {disclaimerAccepted
                ? "Escribe tu primer mensaje, por ejemplo: «Llevo varias noches sin dormir bien por los exámenes»."
                : "Marca la casilla de avisos arriba para activar el chat."}
            </p>
          ) : (
            messages.map((m, idx) => (
              <div
                key={`${idx}-${m.role}-${m.content.slice(0, 24)}`}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm leading-relaxed",
                  m.role === "user" ? "ml-8 bg-indigo-500/15 text-slate-100" : "mr-8 border border-white/10 bg-slate-950/40 text-slate-200",
                )}
              >
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  {m.role === "user" ? "Tú" : "Acompañamiento (IA)"}
                </div>
                <div className="whitespace-pre-wrap">{m.content}</div>
              </div>
            ))
          )}
          {busy ? (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Pensando…
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        {error ? <p className="px-5 pb-2 text-sm text-rose-300">{error}</p> : null}
        {quotaUsed !== null && quotaLimit !== null ? (
          <p className="px-5 pb-2 text-xs text-slate-500">{wb.psychologistQuotaHint(quotaUsed, quotaLimit)}</p>
        ) : null}

        <div className="flex flex-col gap-2 border-t border-white/5 px-5 py-4">
          {suggestedPrompt && messages.length === 0 ? (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="self-start"
              disabled={!disclaimerAccepted || busy}
              onClick={() => void sendMessage(suggestedPrompt)}
            >
              {wb.psychologistSuggestedPrompt}
            </Button>
          ) : null}
          <textarea
            className="min-h-[88px] w-full resize-y rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none ring-indigo-400/30 focus:ring disabled:opacity-50"
            placeholder={disclaimerAccepted ? "Escribe aquí…" : "Acepta los avisos para escribir."}
            value={input}
            disabled={!disclaimerAccepted || busy}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" disabled={!disclaimerAccepted || busy} onClick={() => void sendMessage(input)}>
              <Send className="h-3.5 w-3.5" />
              Enviar
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!disclaimerAccepted || busy || browserListen}
              onClick={startBrowserDictation}
              title="Dictado con el reconocimiento de voz del navegador (Chrome recomendado)"
            >
              <Mic className="h-3.5 w-3.5" />
              Hablar (navegador)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!disclaimerAccepted || busy}
              onClick={() => void (mediaRecording ? stopMediaRecording() : startMediaRecording())}
              title="Grabar audio y transcribir con OpenAI"
            >
              {mediaRecording ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {mediaRecording ? "Parar y transcribir" : "Grabar voz"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={!messages.some((m) => m.role === "assistant")}
              onClick={speakLastAssistant}
              title="Leer en voz alta la última respuesta (voz del sistema)"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Leer última respuesta
            </Button>
          </div>
          <p className="text-[11px] text-slate-500">
            Enter envía; Shift+Enter salta de línea. «Hablar (navegador)» puede no estar en todos los dispositivos. «Grabar voz» usa el
            mismo servicio de transcripción que las exposiciones.
          </p>
        </div>
      </Card>

      <WellbeingHumanSupportPanel compact />
    </div>
  );
}
