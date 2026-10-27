"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, Medal, PartyPopper, Plus, Trophy } from "lucide-react";
import Link from "next/link";

import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { METRIC_LABELS, type Prize, type PrizeMetric } from "@/lib/premios/engine";
import { premiosLoadKind, type PremiosLoadKind } from "@/lib/premios/load-state";

type PrizeProgressJson = { prize: Prize; value: number; awardedAt: string | null; proDaysGranted: number };
type CreatedPrize = Prize & { winners: { name: string; awardedAt: string }[] };
type ApiData = {
  configured: boolean;
  isAdmin?: boolean;
  myCourses?: { id: string; name: string }[];
  items?: PrizeProgressJson[];
  newlyAwarded?: PrizeProgressJson[];
  created?: CreatedPrize[];
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-400/40";
const labelClass = "block text-xs font-medium uppercase tracking-wide text-slate-400";

function rewardText(p: Prize): string {
  return p.reward === "medalla_pro" && p.proDays ? `Medalla + ${p.proDays} días Pro` : "Medalla";
}

function goalText(p: Prize): string {
  const base = `${METRIC_LABELS[p.metric]}: ${p.goal}`;
  return p.metric === "examenes" && p.minScore ? `${base} (nota ≥ ${p.minScore})` : base;
}

export function PremiosPanel() {
  const [data, setData] = useState<ApiData | null>(null);
  const [notice, setNotice] = useState<PremiosLoadKind | null>(null);
  const [busy, setBusy] = useState(false);

  // Formulario de creación
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scope, setScope] = useState<"global" | "course">("global");
  const [courseId, setCourseId] = useState("");
  const [metric, setMetric] = useState<PrizeMetric>("dias_estudio");
  const [goal, setGoal] = useState("7");
  const [minScore, setMinScore] = useState("70");
  const [reward, setReward] = useState<"medalla" | "medalla_pro">("medalla");
  const [proDays, setProDays] = useState("7");
  const [formMsg, setFormMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/premios");
      const body = (await res.json().catch(() => ({}))) as ApiData;
      const kind = premiosLoadKind({ status: res.status, configured: body.configured });
      if (kind === "ready" || kind === "inactive") {
        setData(body);
        setNotice(null);
        return;
      }
      setNotice(kind);
    } catch {
      setNotice("offline");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (notice === "signin") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-50">
          <Trophy className="h-6 w-6 text-amber-300" aria-hidden /> Premios
        </h1>
        <Card>
          <div className="space-y-3 px-6 py-5">
            <p className="text-sm text-slate-300">Inicia sesión para ver tus premios.</p>
            <Link href="/login" className={buttonClasses({ size: "sm" })}>
              Iniciar sesión
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (notice === "offline") {
    return (
      <div className="mx-auto max-w-3xl">
        <Card>
          <div className="px-6 py-5 text-sm text-slate-300">
            No se pudieron cargar los premios. Revisa tu conexión e inténtalo de nuevo.
          </div>
        </Card>
      </div>
    );
  }

  if (!data) return <div className="text-sm text-slate-400">Cargando…</div>;

  if (!data.configured) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-50">
          <Trophy className="h-6 w-6 text-amber-300" aria-hidden /> Premios
        </h1>
        <Card>
          <div className="space-y-2 px-6 py-5">
            <p className="text-sm font-medium text-slate-100">Premios aún no está activo</p>
            <p className="text-sm leading-relaxed text-slate-400">
              Falta activar la tabla de premios en el servidor. En cuanto esté, aquí verás los premios que puedes
              ganar cumpliendo tus metas de estudio.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  const items = data.items ?? [];
  const pending = items.filter((i) => !i.awardedAt);
  const won = items.filter((i) => i.awardedAt);
  const courses = data.myCourses ?? [];
  const canCreate = Boolean(data.isAdmin) || courses.length > 0;
  const effectiveScope = data.isAdmin ? scope : "course";

  const createPrize = async () => {
    setBusy(true);
    setFormMsg(null);
    try {
      const res = await fetch("/api/premios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          scope: effectiveScope,
          courseId: effectiveScope === "course" ? courseId || null : null,
          metric,
          goal: Number(goal),
          minScore: metric === "examenes" ? Number(minScore) : null,
          reward: effectiveScope === "global" ? reward : "medalla",
          proDays: reward === "medalla_pro" && effectiveScope === "global" ? Number(proDays) : null,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "No se pudo crear el premio.");
      setTitle("");
      setDescription("");
      setFormMsg("Premio creado. Los estudiantes que ya cumplan la meta lo ganan en su próxima visita a esta pantalla.");
      await load();
    } catch (e) {
      setFormMsg(e instanceof Error ? e.message : "No se pudo crear el premio.");
    } finally {
      setBusy(false);
    }
  };

  const toggleActive = async (p: Prize) => {
    setBusy(true);
    try {
      await fetch("/api/premios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: p.id, active: !p.active }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold text-slate-50">
          <Trophy className="h-6 w-6 text-amber-300" aria-hidden /> Premios
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-300">
          Cumple metas reales de estudio y gana premios. El avance se calcula con tu actividad en Kampus: días de
          estudio, rachas, duelos, exámenes y temas dominados. Sin trucos: lo que haces, cuenta.
        </p>
      </div>

      {(data.newlyAwarded ?? []).length > 0 ? (
        <p className="flex items-start gap-3 rounded-xl border border-amber-300/30 bg-amber-400/[0.08] px-4 py-3 text-sm text-slate-100">
          <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" aria-hidden />
          <span>
            <strong>¡Ganaste {(data.newlyAwarded ?? []).length === 1 ? "un premio" : "premios"}!</strong>{" "}
            {(data.newlyAwarded ?? []).map((i) => i.prize.title).join(" · ")}
            {(data.newlyAwarded ?? []).some((i) => i.proDaysGranted > 0)
              ? " Tus días Pro ya quedaron sumados a tu plan."
              : ""}
          </span>
        </p>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-50">Premios por ganar</h2>
        {pending.length === 0 ? (
          <Card>
            <div className="px-6 py-5 text-sm text-slate-400">
              {items.length === 0
                ? "Todavía no hay premios activos. Cuando tu profesor o Kampus cree uno, aparecerá aquí con tu avance."
                : "No tienes premios en curso: ya ganaste todos los que están activos. ¡Bien!"}
            </div>
          </Card>
        ) : (
          pending.map(({ prize, value }) => {
            const pct = Math.min(100, Math.round((value / prize.goal) * 100));
            return (
              <Card key={prize.id}>
                <div className="space-y-3 px-6 py-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium text-slate-100">{prize.title}</p>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-200 ring-1 ring-amber-300/20">
                      <Medal className="h-3.5 w-3.5" aria-hidden /> {rewardText(prize)}
                    </span>
                  </div>
                  {prize.description ? <p className="text-sm text-slate-400">{prize.description}</p> : null}
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{goalText(prize)}</span>
                      <span className="font-medium text-slate-100">
                        {value} / {prize.goal}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </section>

      {won.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">Mis premios ganados</h2>
          {won.map(({ prize, awardedAt, proDaysGranted }) => (
            <Card key={prize.id}>
              <div className="flex items-center gap-4 px-6 py-4">
                <Award className="h-8 w-8 shrink-0 text-amber-300" aria-hidden />
                <div>
                  <p className="text-sm font-medium text-slate-100">{prize.title}</p>
                  <p className="text-xs text-slate-400">
                    Ganado el {awardedAt ? new Date(awardedAt).toLocaleDateString("es-VE") : ""}
                    {proDaysGranted > 0 ? ` · +${proDaysGranted} días Pro` : ""} · {goalText(prize)}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </section>
      ) : null}

      {canCreate ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-slate-50">Crear premios</h2>
          <Card>
            <CardHeader>
              <CardTitle>Nuevo premio</CardTitle>
              <CardDescription>
                {data.isAdmin
                  ? "Como administrador creas premios globales para todos los estudiantes, también con días Pro."
                  : "Como docente creas premios para los estudiantes de tus cursos (recompensa: medalla)."}
              </CardDescription>
            </CardHeader>
            <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="pz-title">Título</label>
                <input id="pz-title" className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej.: Semana de constancia" maxLength={80} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="pz-desc">Descripción (opcional)</label>
                <input id="pz-desc" className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Qué celebra este premio" maxLength={300} />
              </div>
              {data.isAdmin ? (
                <div>
                  <label className={labelClass} htmlFor="pz-scope">Alcance</label>
                  <select id="pz-scope" className={inputClass} value={scope} onChange={(e) => setScope(e.target.value as "global" | "course")}>
                    <option value="global">Global (todos los estudiantes)</option>
                    <option value="course" disabled={courses.length === 0}>Un curso mío</option>
                  </select>
                </div>
              ) : null}
              {effectiveScope === "course" ? (
                <div>
                  <label className={labelClass} htmlFor="pz-course">Curso</label>
                  <select id="pz-course" className={inputClass} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                    <option value="">Elige un curso…</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}
              <div>
                <label className={labelClass} htmlFor="pz-metric">Meta</label>
                <select id="pz-metric" className={inputClass} value={metric} onChange={(e) => setMetric(e.target.value as PrizeMetric)}>
                  {Object.entries(METRIC_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass} htmlFor="pz-goal">Cantidad para ganar</label>
                <input id="pz-goal" type="number" min={1} max={365} className={inputClass} value={goal} onChange={(e) => setGoal(e.target.value)} />
              </div>
              {metric === "examenes" ? (
                <div>
                  <label className={labelClass} htmlFor="pz-min">Nota mínima para contar como aprobado</label>
                  <input id="pz-min" type="number" min={1} max={100} className={inputClass} value={minScore} onChange={(e) => setMinScore(e.target.value)} />
                </div>
              ) : null}
              {data.isAdmin && effectiveScope === "global" ? (
                <>
                  <div>
                    <label className={labelClass} htmlFor="pz-reward">Recompensa</label>
                    <select id="pz-reward" className={inputClass} value={reward} onChange={(e) => setReward(e.target.value as "medalla" | "medalla_pro")}>
                      <option value="medalla">Solo medalla</option>
                      <option value="medalla_pro">Medalla + días Pro</option>
                    </select>
                  </div>
                  {reward === "medalla_pro" ? (
                    <div>
                      <label className={labelClass} htmlFor="pz-days">Días Pro</label>
                      <input id="pz-days" type="number" min={1} max={30} className={inputClass} value={proDays} onChange={(e) => setProDays(e.target.value)} />
                    </div>
                  ) : null}
                </>
              ) : null}
              <div className="sm:col-span-2">
                <Button type="button" disabled={busy || title.trim().length < 3 || (effectiveScope === "course" && !courseId)} onClick={() => void createPrize()}>
                  <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Crear premio
                </Button>
                {formMsg ? <p className="mt-3 text-sm text-slate-300">{formMsg}</p> : null}
              </div>
            </div>
          </Card>

          {(data.created ?? []).length > 0 ? (
            <div className="space-y-3">
              {(data.created ?? []).map((p) => (
                <Card key={p.id}>
                  <div className="space-y-2 px-6 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-100">
                        {p.title}{" "}
                        <span className="ml-1 text-xs font-normal text-slate-400">
                          {p.scope === "global" ? "Global" : "Curso"} · {rewardText(p)} · {p.active ? "Activo" : "Pausado"}
                        </span>
                      </p>
                      <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void toggleActive(p)}>
                        {p.active ? "Pausar" : "Activar"}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-400">{goalText(p)}</p>
                    {p.winners.length > 0 ? (
                      <p className="text-xs text-slate-300">
                        Ganadores ({p.winners.length}): {p.winners.map((w) => w.name).join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">Aún sin ganadores.</p>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
