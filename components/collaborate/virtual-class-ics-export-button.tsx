"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  buildVirtualClassIcs,
  defaultVirtualClassIcsFilename,
  downloadIcs,
} from "@/lib/calendar/virtual-class-ics";
import { collaborateCopy } from "@/lib/i18n/collaborate";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  fetchMyEnrolledVirtualClassSessionsForExport,
  type VirtualClassSessionExport,
} from "@/lib/supabase/virtual-class-db";

type Props = {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md";
  /** When set, export these sessions instead of fetching enrolled. */
  sessions?: VirtualClassSessionExport[];
  disabled?: boolean;
};

export function VirtualClassIcsExportButton({ variant = "secondary", size = "sm", sessions, disabled }: Props) {
  const t = collaborateCopy.es;
  const [busy, setBusy] = useState(false);

  async function handleExport() {
    setBusy(true);
    try {
      let rows = sessions;
      if (!rows) {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        rows = await fetchMyEnrolledVirtualClassSessionsForExport(supabase, user.id);
      }
      if (rows.length === 0) return;
      const origin = window.location.origin;
      const ics = buildVirtualClassIcs(
        rows.map((s) => ({
          id: s.id,
          course: s.course,
          topic: s.topic,
          startsAt: s.startsAt,
          endsAt: s.endsAt,
          joinUrl: s.joinUrl,
        })),
        origin,
      );
      downloadIcs(ics, defaultVirtualClassIcsFilename());
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant={variant} size={size} disabled={disabled || busy} onClick={() => void handleExport()} className="gap-1.5">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Download className="h-3.5 w-3.5" />}
      {t.exportIcsCta}
    </Button>
  );
}
