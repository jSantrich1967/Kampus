"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { attributionDismissKey, parseShareAttribution } from "@/lib/growth/attribution";

export function AttributionBanner() {
  const searchParams = useSearchParams();

  const { isKampusShare, campaign, ref } = useMemo(() => parseShareAttribution(searchParams), [searchParams]);

  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!isKampusShare || !campaign) {
      setHidden(true);
      return;
    }
    const key = attributionDismissKey(campaign, ref);
    setHidden(sessionStorage.getItem(key) === "1");
  }, [isKampusShare, campaign, ref]);

  if (!isKampusShare || !campaign || hidden) return null;

  function dismiss() {
    if (!campaign) return;
    sessionStorage.setItem(attributionDismissKey(campaign, ref), "1");
    setHidden(true);
  }

  const title = (() => {
    switch (campaign) {
      case "today_digest":
        return "Llegaste desde un resumen compartido de Hoy";
      case "rescue_pack":
        return "Llegaste desde un kit de rescate compartido";
      case "pass_mode":
        return "Llegaste desde un plan compartido (Modo aprobar)";
      case "quiz_deck":
        return "Llegaste desde un mazo / quiz compartido";
      case "community_invite":
        return "Llegaste desde una invitación a la comunidad";
      case "study_room":
        return "Llegaste desde una sala de estudio";
      case "presentation_team":
        return "Llegaste desde un equipo de exposición";
      case "academic_radar":
        return "Llegaste desde un radar académico compartido";
      case "ai_library":
        return "Llegaste desde el enlace compartido de Mis cuadernos";
      case "exam_workflow":
        return "Llegaste desde un flujo de exámenes compartido";
      case "teacher_workflow":
        return "Llegaste desde un flujo de docencia compartido";
      default:
        return "Llegaste desde un enlace de Kampus";
    }
  })();

  return (
    <div className="border-b border-indigo-400/25 bg-gradient-to-r from-indigo-500/15 to-cyan-400/10 px-4 py-3 text-sm text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-semibold text-white">{title}</div>
          <div className="mt-1 text-xs text-slate-300">
            Activa tu Hoy y une el estudio social — sin perder el hilo académico.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/today">
            <Button size="sm" type="button">
              Ir a Hoy
            </Button>
          </Link>
          <Link href="/community">
            <Button size="sm" type="button" variant="secondary">
              Comunidad
            </Button>
          </Link>
          <Button size="sm" type="button" variant="ghost" onClick={dismiss}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
