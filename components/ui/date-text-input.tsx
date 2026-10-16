"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/cn";

function validIso(y: number, mo: number, d: number): string | null {
  if (!Number.isInteger(y) || mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${y}-${p(mo)}-${p(d)}`;
}

/** Acepta dd/mm/aaaa o aaaa-mm-dd (escrito o pegado). Devuelve ISO o null. */
export function parseDateText(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return validIso(Number(m[1]), Number(m[2]), Number(m[3]));
  m = t.match(/^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/);
  if (m) return validIso(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

function isoToDisplay(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

type DateTextInputProps = {
  /** Fecha en ISO (aaaa-mm-dd) o "" */
  value: string;
  onChange: (iso: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
  ariaLabel?: string;
};

/**
 * Campo de fecha que acepta escritura y pegado (dd/mm/aaaa o aaaa-mm-dd),
 * a diferencia del input nativo type="date" que en varios navegadores no
 * deja escribir ni pegar. Normaliza a ISO para el estado padre.
 */
export function DateTextInput({ value, onChange, required, className, id, ariaLabel }: DateTextInputProps) {
  const [text, setText] = useState(() => isoToDisplay(value));
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setText(isoToDisplay(value));
  }, [value]);

  const parsed = parseDateText(text);
  const invalid = touched && text.trim().length > 0 && !parsed;

  return (
    <span className="block">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        spellCheck={false}
        required={required}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        placeholder="dd/mm/aaaa"
        className={cn(className, invalid && "border-rose-400/60")}
        value={text}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          const iso = parseDateText(next);
          if (iso) onChange(iso);
          else if (!next.trim()) onChange("");
        }}
        onBlur={() => setTouched(true)}
      />
      {invalid ? (
        <span className="mt-1 block text-[11px] text-rose-300">Fecha no válida. Usa dd/mm/aaaa.</span>
      ) : null}
    </span>
  );
}
