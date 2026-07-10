import type { ClassPresentationSlide } from "@/lib/schemas/class-presentation";
import type { SlideTheme } from "@/lib/class-presentation/slide-theme";
import { cn } from "@/lib/cn";

type Props = {
  diagram: NonNullable<ClassPresentationSlide["diagram"]>;
  theme: SlideTheme;
  className?: string;
};

function Connector({ className }: { className?: string }) {
  return (
    <svg className={cn("mx-auto h-6 w-6 text-white/25", className)} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 4v12M8 12l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ClassSlideDiagram({ diagram, theme, className }: Props) {
  if (diagram.type === "cycle") {
    return (
      <div className={cn("relative mx-auto max-w-md", className)}>
        <svg className="absolute inset-0 h-full w-full opacity-20" aria-hidden>
          <circle cx="50%" cy="50%" r="42%" fill="none" stroke="currentColor" strokeWidth="1" className="text-white" />
        </svg>
        <div className="grid grid-cols-2 gap-3 p-4">
          {diagram.items.map((item, i) => (
            <div
              key={`${item.label}-${i}`}
              className={cn(
                "rounded-2xl border p-3 backdrop-blur-sm",
                theme.bulletBorder,
                i === 0 && "col-span-2 mx-auto max-w-[70%]",
              )}
            >
              <p className="text-sm font-semibold text-white">{item.label}</p>
              {item.detail ? <p className="mt-1 text-xs leading-relaxed text-slate-300">{item.detail}</p> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (diagram.type === "concept") {
    const [center, ...orbit] = diagram.items;
    return (
      <div className={cn("relative flex flex-col items-center gap-4", className)}>
        <div className={cn("relative z-10 rounded-3xl border px-6 py-5 text-center shadow-2xl", theme.border, theme.bulletBorder)}>
          <p className="text-lg font-bold text-white">{center?.label ?? "Idea central"}</p>
          {center?.detail ? <p className="mt-2 text-sm text-slate-300">{center.detail}</p> : null}
        </div>
        {orbit.length > 0 ? (
          <div className="grid w-full gap-2 sm:grid-cols-3">
            {orbit.map((item, i) => (
              <div key={`${item.label}-${i}`} className={cn("rounded-xl border p-3 text-center", theme.bulletBorder)}>
                <p className="text-xs font-semibold uppercase tracking-wide text-white/70">{item.label}</p>
                {item.detail ? <p className="mt-1 text-xs text-slate-400">{item.detail}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  if (diagram.type === "compare") {
    const [left, right, ...rest] = diagram.items;
    return (
      <div className={cn("grid gap-4 sm:grid-cols-2", className)}>
        {[left, right].filter(Boolean).map((item, i) => (
          <div
            key={`${item!.label}-${i}`}
            className={cn(
              "relative overflow-hidden rounded-2xl border p-5 shadow-lg",
              theme.border,
              theme.bulletBorder,
              i === 0 ? "sm:translate-y-2" : "sm:-translate-y-2",
            )}
          >
            <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5 blur-2xl" />
            <p className="text-base font-bold text-white">{item!.label}</p>
            {item!.detail ? <p className="mt-2 text-sm leading-relaxed text-slate-300">{item!.detail}</p> : null}
          </div>
        ))}
        {rest.length > 0 ? (
          <p className="sm:col-span-2 text-center text-xs text-slate-500">{rest.map((r) => r.label).join(" · ")}</p>
        ) : null}
      </div>
    );
  }

  if (diagram.type === "flow") {
    return (
      <div className={cn("mx-auto max-w-md space-y-1", className)}>
        {diagram.items.map((item, i) => (
          <div key={`${item.label}-${i}`}>
            <div className={cn("rounded-2xl border px-5 py-4 shadow-md", theme.border, theme.bulletBorder)}>
              <div className="flex items-start gap-3">
                <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ring-1", theme.iconBg)}>
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{item.label}</p>
                  {item.detail ? <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.detail}</p> : null}
                </div>
              </div>
            </div>
            {i < diagram.items.length - 1 ? <Connector /> : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {diagram.items.map((item, i) => (
        <div key={`${item.label}-${i}`} className={cn("rounded-2xl border p-4", theme.bulletBorder, theme.border)}>
          <p className="text-sm font-semibold text-white">{item.label}</p>
          {item.detail ? <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.detail}</p> : null}
        </div>
      ))}
    </div>
  );
}
