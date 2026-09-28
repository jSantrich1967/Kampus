"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { organizationRoleLabel, type OrganizationMembership } from "@/lib/organizations/membership";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { listMyOrganizations } from "@/lib/supabase/organizations-db";

export function MyOrganizations({ userId }: { userId: string | null }) {
  const [rows, setRows] = useState<OrganizationMembership[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured()) {
      setRows([]);
      setReady(true);
      return;
    }
    let cancelled = false;
    listMyOrganizations(createSupabaseBrowserClient(), userId)
      .then((memberships) => {
        if (!cancelled) setRows(memberships);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Instituciones</CardTitle>
        <CardDescription>
          Tu cuenta personal no cambia. Aquí aparecen los colegios o universidades que te agregaron.
        </CardDescription>
      </CardHeader>
      {!ready ? (
        <p className="text-sm text-slate-400">Buscando instituciones…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-slate-400">Todavía no perteneces a una institución.</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.organizationId} className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-100">{row.name}</span>
              <Badge>{organizationRoleLabel(row.role)}</Badge>
              {row.memberStatus === "suspended" ? <Badge>Acceso suspendido</Badge> : null}
              {row.organizationStatus === "suspended" ? <Badge>Institución suspendida</Badge> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
