"use client";

import { useState } from "react";

import { cn } from "@/lib/cn";
import { initialsFor } from "@/lib/profile/avatar";

/**
 * Avatar del usuario: su foto si tiene (y carga), o sus iniciales.
 * Si la URL falla (foto borrada, sin red), cae a las iniciales sin romperse.
 */
export function UserAvatar({
  name,
  avatarUrl,
  size = 40,
  className,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const url = (avatarUrl ?? "").trim();
  const showPhoto = url.length > 0 && !failed;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-purple-500/25 font-semibold text-purple-100 ring-1 ring-white/15",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.38)) }}
      aria-hidden
    >
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initialsFor(name || "?")
      )}
    </span>
  );
}
