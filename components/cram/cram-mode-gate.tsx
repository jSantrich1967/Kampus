"use client";

import { CramMode } from "@/components/cram/cram-mode";

/**
 * Modo examen es del plan Pro, pero con cuenta Estudiante hay una probada
 * real: 1 diagnóstico gratis al día. El estudiante ve sus temas flojos y
 * el plan de estudio que sigue sí pide Pro, en ese mismo momento.
 * La API aplica el cupo en el servidor; CramMode muestra la tarjeta de
 * Pro cuando la probada se agota o cuando se pide el plan.
 */
export function CramModeGate() {
  return <CramMode />;
}
