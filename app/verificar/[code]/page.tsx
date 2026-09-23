import type { Metadata } from "next";
import { Award, BadgeCheck, XCircle } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCertificateByCode } from "@/lib/supabase/certificates-db";

export const metadata: Metadata = { title: "Verificar certificado" };

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  let cert = null;
  try {
    const supabase = await createSupabaseServerClient();
    cert = await getCertificateByCode(supabase, code);
  } catch {
    cert = null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl">
        {cert ? (
          <>
            <BadgeCheck className="mx-auto h-12 w-12 text-emerald-300" />
            <p className="mt-4 text-xs uppercase tracking-widest text-emerald-300">Certificado verificado</p>
            <Award className="mx-auto mt-6 h-16 w-16 text-amber-300" />
            <h1 className="mt-4 text-2xl font-bold text-white">{cert.title}</h1>
            <p className="mt-2 text-lg text-slate-200">{cert.ownerName}</p>
            {cert.detail ? <p className="mt-1 text-sm text-slate-400">{cert.detail}</p> : null}
            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-400">
              <p>
                Emitido el <span className="text-slate-200">{formatDate(cert.issuedAt)}</span>
              </p>
              <p className="mt-1">
                Código <span className="font-mono text-slate-200">{cert.code}</span>
              </p>
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Este certificado fue emitido en Kampus y su código es válido.
            </p>
          </>
        ) : (
          <>
            <XCircle className="mx-auto h-12 w-12 text-rose-300" />
            <h1 className="mt-4 text-xl font-bold text-white">Código no encontrado</h1>
            <p className="mt-2 text-sm text-slate-400">
              No existe un certificado con el código{" "}
              <span className="font-mono text-slate-200">{code}</span>. Revisa que esté bien escrito.
            </p>
          </>
        )}
        <a
          href="/"
          className="mt-8 inline-block rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Ir a Kampus
        </a>
      </div>
    </main>
  );
}
