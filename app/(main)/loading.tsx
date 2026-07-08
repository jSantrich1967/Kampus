export default function MainLoading() {
  return (
    <div className="animate-pulse space-y-6" aria-live="polite" aria-busy="true">
      <div className="h-8 w-48 rounded-lg bg-white/10" />
      <div className="h-4 w-72 max-w-full rounded bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-36 rounded-2xl bg-white/5 ring-1 ring-white/10" />
        <div className="h-36 rounded-2xl bg-white/5 ring-1 ring-white/10" />
      </div>
      <div className="h-52 rounded-2xl bg-white/5 ring-1 ring-white/10" />
    </div>
  );
}
