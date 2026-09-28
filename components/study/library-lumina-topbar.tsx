"use client";

import { Bell, Search } from "lucide-react";

import { useKampus } from "@/components/kampus/kampus-provider";

type LibraryLuminaTopBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
};

function roleChipLabel(role: string): string {
  if (role === "teacher") return "Docente";
  if (role === "learner") return "Autodidacta";
  if (role === "institution") return "Institución";
  return "Estudiante";
}

export function LibraryLuminaTopBar({ search, onSearchChange }: LibraryLuminaTopBarProps) {
  const { profile } = useKampus();
  const roleLabel = roleChipLabel(profile.role);
  const displayName = profile.displayName.trim() || roleLabel;

  return (
    <header className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:max-w-md">
        <Search className="pointer-events-none absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar materia, apunte, tema o fecha…"
          className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-4 pl-11 text-sm text-white outline-none transition-all placeholder:text-gray-500 focus:border-purple-500"
        />
      </div>

      <div className="flex items-center justify-end gap-4 sm:gap-6">
        <button
          type="button"
          className="relative text-gray-400 transition-colors hover:text-white"
          aria-label="Notificaciones"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute top-0 right-0 h-2 w-2 rounded-full border-2 border-[#0e0e13] bg-purple-500" />
        </button>

        <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
          <div className="hidden text-right sm:block">
            <p className="text-xs font-bold text-white">{displayName}</p>
            <p className="text-[10px] font-black uppercase text-purple-400">{roleLabel}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full border border-purple-500/50 bg-gradient-to-br from-purple-500 to-purple-700 text-xs font-bold text-white">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
}
