import type { ClassPresentationSlide } from "@/lib/schemas/class-presentation";
import { cn } from "@/lib/cn";

type Props = {
  diagram: NonNullable<ClassPresentationSlide["diagram"]>;
  className?: string;
};

export function ClassSlideDiagram({ diagram, className }: Props) {
  if (diagram.type === "compare") {
    const [left, right, ...rest] = diagram.items;
    return (
      <div className={cn("grid gap-3 sm:grid-cols-2", className)}>
        {[left, right].filter(Boolean).map((item, i) => (
          <div
            key={`${item!.label}-${i}`}
            className="rounded-xl border border-white/15 bg-white/[0.06] p-4"
          >
            <p className="text-sm font-semibold text-indigo-100">{item!.label}</p>
            {item!.detail ? <p className="mt-2 text-xs leading-relaxed text-slate-300">{item!.detail}</p> : null}
          </div>
        ))}
        {rest.length > 0 ? (
          <div className="sm:col-span-2 text-center text-xs text-slate-500">
            {rest.map((r) => r.label).join(" · ")}
          </div>
        ) : null}
      </div>
    );
  }

  if (diagram.type === "flow") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        {diagram.items.map((item, i) => (
          <div key={`${item.label}-${i}`} className="relative">
            <div className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-3">
              <p className="text-sm font-semibold text-emerald-50">{item.label}</p>
              {item.detail ? <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">{item.detail}</p> : null}
            </div>
            {i < diagram.items.length - 1 ? (
              <div className="flex justify-center py-1 text-slate-500" aria-hidden>
                ↓
              </div>
            ) : null}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ul className={cn("space-y-2", className)}>
      {diagram.items.map((item, i) => (
        <li
          key={`${item.label}-${i}`}
          className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/25 text-xs font-bold text-indigo-100">
            {i + 1}
          </span>
          <div>
            <p className="text-sm font-medium text-slate-100">{item.label}</p>
            {item.detail ? <p className="mt-0.5 text-xs text-slate-400">{item.detail}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
