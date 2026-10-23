"use client";

import dynamic from "next/dynamic";

import { isCopilotPilotEnabled } from "@/lib/copilot-pilot/config";
import type { NotebookCopilotSheet } from "./notebook-copilot-inner";

export type { NotebookCopilotSheet };

type Props = {
  notebookTitle: string;
  sheets: NotebookCopilotSheet[];
};

// Carga diferida: mientras la bandera esté apagada (por defecto), el
// código de CopilotKit ni siquiera se descarga en el navegador.
const NotebookCopilotInner = dynamic(() => import("./notebook-copilot-inner"), {
  ssr: false,
});

/**
 * Puerta del piloto CopilotKit en la página del cuaderno.
 * Apagado por defecto (NEXT_PUBLIC_COPILOT_PILOT_ENABLED): sin la bandera
 * —o sin hojas en el cuaderno— no renderiza nada.
 */
export function NotebookCopilot({ notebookTitle, sheets }: Props) {
  if (!isCopilotPilotEnabled()) return null;
  if (sheets.length === 0) return null;
  return <NotebookCopilotInner notebookTitle={notebookTitle} sheets={sheets} />;
}
