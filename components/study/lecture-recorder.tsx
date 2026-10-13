"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mic, MicOff, Square } from "lucide-react";

import { cn } from "@/lib/cn";
import { buttonClasses } from "@/components/ui/button";

type Phase = "idle" | "requesting" | "recording" | "processing" | "done" | "error";

type Limits = {
  plan: "free" | "premium";
  maxSeconds: number;
  maxMinutes: number;
  dailyLimit: number;
};

type DoneResult = {
  documentId: string;
  notebookSlug: string;
  subject: string;
  transcript: string;
  notes: string;
};

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  for (const c of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(c)) return c;
    } catch {
      /* noop */
    }
  }
  return "";
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function LectureRecorder() {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [subject, setSubject] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [autoStopped, setAutoStopped] = useState(false);
  const [result, setResult] = useState<DoneResult | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number>(0);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const levelBarRef = useRef<HTMLDivElement | null>(null);
  const stoppedForLimitRef = useRef(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/lecture/limits")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive && j && typeof j.maxSeconds === "number") setLimits(j as Limits);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const cleanupAudio = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    analyserRef.current = null;
  }, []);

  useEffect(() => cleanupAudio, [cleanupAudio]);

  const updateLevel = useCallback(() => {
    const analyser = analyserRef.current;
    const bar = levelBarRef.current;
    if (analyser && bar) {
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const pct = Math.min(100, Math.round(rms * 320));
      bar.style.width = `${pct}%`;
    }
    rafRef.current = requestAnimationFrame(updateLevel);
  }, []);

  const processRecording = useCallback(
    async (blob: Blob, durationSeconds: number) => {
      setPhase("processing");
      setError(null);
      setErrorCode(null);
      try {
        const fd = new FormData();
        fd.append("audio", blob, "clase.webm");
        fd.append("subject", subject.trim() || "General");
        fd.append("durationSeconds", String(durationSeconds));
        const res = await fetch("/api/lecture/transcribe", { method: "POST", body: fd });
        const json = (await res.json().catch(() => null)) as {
          error?: string;
          code?: string;
          documentId?: string;
          notebookSlug?: string;
          subject?: string;
          transcript?: string;
          notes?: string;
        } | null;
        if (!res.ok) {
          setErrorCode(typeof json?.code === "string" ? json.code : null);
          throw new Error(json?.error || "No se pudo procesar la grabación.");
        }
        if (!json?.documentId || !json?.notebookSlug) {
          throw new Error("Respuesta incompleta del servidor.");
        }
        setResult({
          documentId: json.documentId,
          notebookSlug: json.notebookSlug,
          subject: json.subject || subject.trim() || "General",
          transcript: json.transcript || "",
          notes: json.notes || "",
        });
        setPhase("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo procesar la grabación.");
        setPhase("error");
      }
    },
    [subject],
  );

  const stoppingRef = useRef(false);

  const stopRecording = useCallback(
    (forLimit: boolean) => {
      const rec = mediaRecorderRef.current;
      if (!rec || rec.state === "inactive" || stoppingRef.current) return;
      stoppingRef.current = true;
      stoppedForLimitRef.current = forLimit;
      setAutoStopped(forLimit);
      rec.stop();
    },
    [],
  );

  const startRecording = useCallback(async () => {
    setError(null);
    setErrorCode(null);
    setResult(null);
    setAutoStopped(false);
    setElapsed(0);

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Tu navegador no permite grabar audio en este dispositivo.");
      setPhase("error");
      return;
    }

    setPhase("requesting");
    stoppingRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      rec.onstop = () => {
        const durationSeconds = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
        const type = rec.mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        const wasLimit = stoppedForLimitRef.current;
        stoppedForLimitRef.current = false;
        cleanupAudio();
        setElapsed(durationSeconds);
        if (wasLimit) setAutoStopped(true);
        void processRecording(blob, durationSeconds);
      };

      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctx) {
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const src = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
        analyserRef.current = analyser;
        rafRef.current = requestAnimationFrame(updateLevel);
      }

      startedAtRef.current = Date.now();
      rec.start(1000);

      const maxSeconds = limits?.maxSeconds ?? 600;
      timerRef.current = setInterval(() => {
        const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setElapsed(s);
        if (s >= maxSeconds) {
          stopRecording(true);
        }
      }, 500);

      setPhase("recording");
    } catch (e) {
      cleanupAudio();
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        setError("No pudimos acceder al micrófono. Revisa el permiso en tu navegador y vuelve a intentarlo.");
      } else if (name === "NotFoundError" || name === "OverconstrainedError") {
        setError("No encontramos un micrófono en este dispositivo.");
      } else {
        setError("No se pudo iniciar la grabación. Inténtalo de nuevo.");
      }
      setPhase("error");
    }
  }, [cleanupAudio, limits, processRecording, stopRecording, updateLevel]);

  const reset = useCallback(() => {
    cleanupAudio();
    stoppingRef.current = false;
    setPhase("idle");
    setElapsed(0);
    setError(null);
    setErrorCode(null);
    setResult(null);
    setAutoStopped(false);
  }, [cleanupAudio]);

  const maxMinutes = limits?.maxMinutes ?? 10;

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:p-8">
        {phase !== "done" ? (
          <>
            <label htmlFor="lecture-subject" className="mb-1 block text-sm font-medium text-slate-300">
              Materia de la clase
            </label>
            <input
              id="lecture-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ej. Biología"
              disabled={phase === "recording" || phase === "requesting" || phase === "processing"}
              className="mb-6 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none disabled:opacity-50"
            />

            <div className="flex flex-col items-center gap-4">
              <div
                aria-hidden
                className={cn(
                  "flex h-28 w-28 items-center justify-center rounded-full border transition",
                  phase === "recording"
                    ? "border-red-400/60 bg-red-500/15"
                    : "border-indigo-400/40 bg-indigo-500/10",
                )}
              >
                {phase === "recording" ? (
                  <span className="relative flex h-10 w-10">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
                    <span className="relative inline-flex h-10 w-10 rounded-full bg-red-500" />
                  </span>
                ) : (
                  <Mic className="h-10 w-10 text-indigo-300" aria-hidden />
                )}
              </div>

              <div className="font-mono text-4xl font-bold text-white" aria-live="polite">
                {formatTimer(elapsed)}
              </div>
              <p className="text-xs text-slate-400">
                {limits
                  ? `Límite: ${maxMinutes} min por grabación · ${limits.dailyLimit} al día (${limits.plan === "premium" ? "Pro" : "Gratis"})`
                  : "Cargando límites…"}
              </p>

              {phase === "recording" ? (
                <div className="w-full max-w-xs">
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div ref={levelBarRef} className="h-full rounded-full bg-emerald-400 transition-[width] duration-100" style={{ width: "0%" }} />
                  </div>
                  <p className="mt-1 text-center text-xs text-slate-500">Nivel de audio</p>
                </div>
              ) : null}

              {phase === "idle" || phase === "error" ? (
                <button
                  type="button"
                  onClick={() => void startRecording()}
                  className={buttonClasses({ size: "lg" })}
                >
                  <Mic className="h-5 w-5" aria-hidden />
                  Grabar clase
                </button>
              ) : null}

              {phase === "requesting" ? (
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Pidiendo permiso del micrófono…
                </p>
              ) : null}

              {phase === "recording" ? (
                <button
                  type="button"
                  onClick={() => stopRecording(false)}
                  className={buttonClasses({ size: "lg", variant: "secondary" })}
                >
                  <Square className="h-5 w-5" aria-hidden />
                  Detener y procesar
                </button>
              ) : null}

              {phase === "processing" ? (
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Transcribiendo y armando tus apuntes… esto puede tardar un minuto.
                </p>
              ) : null}

              {autoStopped && phase !== "recording" ? (
                <p className="flex items-center gap-2 text-sm text-amber-300">
                  <AlertTriangle className="h-4 w-4" aria-hidden />
                  Se alcanzó el límite de {maxMinutes} minutos y se detuvo la grabación.
                </p>
              ) : null}

              {phase === "error" && error ? (
                <div className="w-full rounded-xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">
                  <p className="flex items-start gap-2">
                    <MicOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </p>
                  {errorCode === "LECTURE_QUOTA_EXHAUSTED" ? (
                    <Link href="/pro" className="mt-3 inline-block font-semibold text-indigo-300 underline">
                      Pasarme a Pro ($5/mes)
                    </Link>
                  ) : (
                    <button type="button" onClick={reset} className="mt-3 font-semibold text-indigo-300 underline">
                      Intentar de nuevo
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div>
            <p className="mb-2 flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              <span className="font-semibold">Clase guardada en tu cuaderno de {result?.subject}</span>
            </p>

            {result?.notes ? (
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.04] p-4">
                <p className="mb-2 text-xs font-bold tracking-widest text-indigo-300 uppercase">Apuntes</p>
                <div className="whitespace-pre-wrap text-sm text-slate-200">{result.notes}</div>
              </div>
            ) : (
              <p className="mb-4 text-sm text-slate-400">
                Guardamos la transcripción completa en tu cuaderno (los apuntes no se pudieron generar esta vez).
              </p>
            )}

            {result?.transcript ? (
              <details className="mb-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-300">
                  Ver transcripción completa
                </summary>
                <p className="mt-2 max-h-64 overflow-y-auto whitespace-pre-wrap text-sm text-slate-400">
                  {result.transcript}
                </p>
              </details>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Link href={`/study/notebook/${result?.notebookSlug}`} className={buttonClasses({ size: "sm" })}>
                Abrir en el cuaderno
              </Link>
              <Link
                href={`/study/notebook/${result?.notebookSlug}?kit=1`}
                className={buttonClasses({ size: "sm", variant: "secondary" })}
              >
                Estudiar con IA
              </Link>
              <button type="button" onClick={reset} className={buttonClasses({ size: "sm", variant: "ghost" })}>
                Grabar otra clase
              </button>
            </div>
          </div>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-slate-500">
        El audio se procesa para crear tus apuntes y se guarda en tu cuaderno. Habla cerca del micrófono para una mejor transcripción.
      </p>
    </div>
  );
}
