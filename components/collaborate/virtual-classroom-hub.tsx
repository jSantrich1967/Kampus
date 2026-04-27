"use client";

import Link from "next/link";
import { Video } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildVirtualClassSessions } from "@/lib/virtual-classroom-mock";
import { useMemo } from "react";

export function VirtualClassroomHub() {
  const { profile, locale } = useKampus();
  const es = locale === "es";
  const sessions = useMemo(() => buildVirtualClassSessions(profile), [profile]);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-200/80">
          {es ? "En vivo" : "Live"}
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white md:text-4xl">
          {es ? "Aula virtual" : "Virtual classroom"}
        </h1>
        <p className="mt-2 max-w-3xl text-base text-slate-300">
          {es
            ? "Ve qué clase hay, con quién, el tema del día, si hay cupo y entra. La videollamada y la presentación son enlaces de demo hasta conectar tu proveedor institucional."
            : "See what class is on, with whom, today’s topic, seats left, and join. Video and slides are demo links until your institution connects a provider."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {sessions.map((s) => {
          const seatsLeft = Math.max(0, s.capacity - s.enrolled);
          const full = seatsLeft === 0;
          return (
            <Card key={s.id} className="border-white/10 bg-slate-950/40">
              <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg text-white">{s.course}</CardTitle>
                    <CardDescription className="mt-1 text-slate-400">
                      {s.professor} · {s.roomLabel}
                    </CardDescription>
                  </div>
                  <Badge tone={full ? "danger" : seatsLeft <= 3 ? "warning" : "success"}>
                    {full ? (es ? "Lleno" : "Full") : `${seatsLeft} ${es ? "cupos" : "seats"}`}
                  </Badge>
                </div>
                <div className="text-sm text-slate-200">
                  <span className="text-slate-500">{es ? "Tema:" : "Topic:"}</span> {s.topic}
                </div>
                <div className="text-xs text-slate-500">
                  {es ? "Inicio (demo):" : "Starts (demo):"}{" "}
                  <span suppressHydrationWarning>
                    {new Date(s.startsAt).toLocaleString(es ? "es" : "en", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  {" · "}
                  {s.enrolled}/{s.capacity} {es ? "inscritos" : "enrolled"}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {full ? (
                    <Button type="button" size="sm" disabled>
                      {es ? "Sin cupo" : "No seats"}
                    </Button>
                  ) : (
                    <Link
                      href={`/collaborate/aula-virtual/${encodeURIComponent(s.id)}`}
                      className={buttonClasses({ size: "sm", className: "gap-2" })}
                    >
                      <Video className="h-4 w-4" />
                      {es ? "Entrar al aula" : "Enter classroom"}
                    </Link>
                  )}
                </div>
              </CardHeader>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
