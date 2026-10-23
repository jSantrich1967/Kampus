"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CopilotKit, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";

import "@copilotkit/react-ui/styles.css";

import {
  buildStudyPlan,
  summarizeStudyPlan,
  type StudyPlan,
} from "@/lib/copilot-pilot/study-plan";

export type NotebookCopilotSheet = {
  title: string;
  date?: string | null;
};

type Props = {
  notebookTitle: string;
  sheets: NotebookCopilotSheet[];
};

const PILOT_INSTRUCTIONS = [
  "Eres el Asistente Kampus (piloto), un copiloto dentro de la app de estudio. Respondes SIEMPRE en español claro y cálido.",
  "Conoces el cuaderno que el estudiante tiene abierto: su título y la lista de hojas/temas llegan en el contexto. Úsalos para personalizar tus respuestas.",
  "Tu acción estrella es `generarPlanDeRepasos`: cuando el estudiante pida un plan de estudio o de repasos para este cuaderno, ejecútala. Ella arma el plan con repetición espaciada y lo muestra como tarjeta; no escribas el plan a mano en el chat, solo resume en una frase que ya está listo.",
  "MÉTODO SOCRÁTICO (obligatorio, igual que el Tutor IA de Kampus): guía con preguntas, una a la vez. NUNCA hagas la tarea ni resuelvas exámenes por el estudiante; si lo pide, propón hacerlo juntos paso a paso.",
  "Respuestas cortas y útiles. No inventes temas que no estén en el cuaderno.",
].join("\n");

function StudyPlanCard({ plan }: { plan: StudyPlan }) {
  return (
    <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-50">
      <p className="font-semibold text-white">
        Plan de repasos — {plan.notebookTitle}
      </p>
      <p className="mt-1 text-indigo-100/90">
        {plan.totalTopics} temas con repetición espaciada (días{" "}
        {plan.sessions.map((s) => s.dayOffset).join(", ")}).
      </p>
      <ul className="mt-3 space-y-2">
        {plan.sessions.map((session) => (
          <li
            key={session.round}
            className="rounded-xl border border-white/10 bg-slate-950/30 px-3 py-2"
          >
            <p className="font-medium text-white">
              {session.dayLabel} · Ronda {session.round}
            </p>
            <p className="mt-0.5 text-indigo-100/90">{session.guidance}</p>
            <p className="mt-1 text-xs text-indigo-200/80">
              Temas: {session.topics.join(" · ")}
            </p>
          </li>
        ))}
      </ul>
      <Link
        href="/repasos"
        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-400"
      >
        Ir a mis repasos
      </Link>
    </div>
  );
}

function CopilotBridge({ notebookTitle, sheets }: Props) {
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  const topicTitles = useMemo(
    () => sheets.map((s) => s.title).filter((t) => t.trim().length > 0),
    [sheets],
  );

  // (a) LEE el cuaderno abierto: solo estructura (título + títulos de
  // hojas/temas y fechas), nunca el contenido privado de las hojas.
  useCopilotReadable({
    description:
      "Cuaderno abierto por el estudiante: título y estructura de hojas/temas (sin contenido de las hojas).",
    value: [
      `Cuaderno: ${notebookTitle}`,
      "Hojas/temas en orden:",
      ...sheets.map(
        (s, i) => `${i + 1}. ${s.title}${s.date ? ` (clase del ${s.date})` : ""}`,
      ),
    ].join("\n"),
  });

  // (b) EJECUTA la acción estrella: generar el plan de repasos.
  useCopilotAction({
    name: "generarPlanDeRepasos",
    description:
      "Genera un plan de estudio con repetición espaciada para el cuaderno abierto y lo presenta como tarjeta en la pantalla, con acceso a /repasos. Úsala cuando el estudiante pida un plan de estudio o de repasos.",
    parameters: [
      {
        name: "enfoque",
        type: "string",
        description:
          "Enfoque opcional del estudiante (p. ej. «tengo examen el viernes»). Solo informativo.",
        required: false,
      },
    ],
    handler: async () => {
      const built = buildStudyPlan(notebookTitle, topicTitles);
      setPlan(built);
      return summarizeStudyPlan(built);
    },
    render: ({ status }) => {
      if (status === "complete" && plan) {
        return <StudyPlanCard plan={plan} />;
      }
      return (
        <p className="text-sm text-slate-300">
          {status === "complete"
            ? "Plan generado. Revisa la tarjeta en la pantalla."
            : "Generando tu plan de repasos…"}
        </p>
      );
    },
  });

  return (
    <>
      <CopilotSidebar
        instructions={PILOT_INSTRUCTIONS}
        labels={{
          title: "Asistente Kampus (piloto)",
          initial:
            "¡Hola! Estoy viendo tu cuaderno abierto. Pídeme un plan de repasos y lo armo con repetición espaciada, o pregúntame cómo estudiar un tema — te guío con preguntas, sin hacerte la tarea.",
          placeholder: "Pregúntame sobre tu cuaderno…",
          error: "❌ Algo falló. Inténtalo de nuevo.",
          stopGenerating: "Detener",
          regenerateResponse: "Regenerar respuesta",
          copyToClipboard: "Copiar",
          thumbsUp: "Me gusta",
          thumbsDown: "No me gusta",
        }}
        defaultOpen={false}
      >
        <></>
      </CopilotSidebar>
      {plan ? (
        <div className="mt-4">
          <StudyPlanCard plan={plan} />
        </div>
      ) : null}
    </>
  );
}

export default function NotebookCopilotInner(props: Props) {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotBridge {...props} />
    </CopilotKit>
  );
}
