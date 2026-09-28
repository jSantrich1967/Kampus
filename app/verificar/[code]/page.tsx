import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Award, BadgeCheck, XCircle } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  certificateKind,
  certificatePublicCopy,
  classifyCertificateLookup,
  getCertificateByCode,
  type Certificate,
  type CertificateLookupStatus,
} from "@/lib/supabase/certificates-db";

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
  let certificate: Certificate | null = null;
  let lookup: CertificateLookupStatus = "unavailable";
  try {
    const supabase = await createSupabaseServerClient();
    certificate = await getCertificateByCode(supabase, code);
    lookup = classifyCertificateLookup({ ok: true, certificate });
  } catch {
    lookup = classifyCertificateLookup({ ok: false });
  }

  const copy = certificate
    ? certificatePublicCopy(certificateKind(certificate), certificate.institutionName)
    : null;
  const institutional = certificate ? certificateKind(certificate) === "institutional" : false;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col items-center justify-center px-6 py-16">
      <div className="w-full rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center shadow-2xl">
        {lookup === "found" && certificate && copy ? (
          <>
            {institutional ? (
              <BadgeCheck className="mx-auto h-12 w-12 text-sky-300" />
            ) : (
              <Award className="mx-auto h-12 w-12 text-amber-300" />
            )}
            <p
              className={`mt-4 text-xs uppercase tracking-widest ${institutional ? "text-sky-300" : "text-amber-200"}`}
            >
              {copy.title}
            </p>
            <h1 className="mt-6 text-2xl font-bold text-white">{certificate.title}</h1>
            <p className="mt-2 text-lg text-slate-200">{certificate.ownerName}</p>
            {certificate.detail ? <p className="mt-1 text-sm text-slate-400">{certificate.detail}</p> : null}
            <div className="mt-6 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-slate-400">
              <p>
                Guardado el <span className="text-slate-200">{formatDate(certificate.issuedAt)}</span>
              </p>
              <p className="mt-1">
                Código <span className="font-mono text-slate-200">{certificate.code}</span>
              </p>
            </div>
            <p className="mt-6 text-xs text-slate-400">{copy.body}</p>
          </>
        ) : null}

        {lookup === "missing" ? (
          <>
            <XCircle className="mx-auto h-12 w-12 text-rose-300" />
            <h1 className="mt-4 text-xl font-bold text-white">Código no encontrado</h1>
            <p className="mt-2 text-sm text-slate-400">
              No existe un certificado con el código{" "}
              <span className="font-mono text-slate-200">{code}</span>. Revisa que esté bien escrito.
            </p>
          </>
        ) : null}

        {lookup === "unavailable" ? (
          <>
            <AlertTriangle className="mx-auto h-12 w-12 text-amber-300" />
            <h1 className="mt-4 text-xl font-bold text-white">No se pudo comprobar el código</h1>
            <p className="mt-2 text-sm text-slate-400">
              El servicio no respondió. Eso no significa que el código{" "}
              <span className="font-mono text-slate-200">{code}</span> sea inválido. Inténtalo de nuevo en unos
              minutos.
            </p>
          </>
        ) : null}

        <Link
          href="/"
          className="mt-8 inline-block rounded-xl bg-indigo-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-400"
        >
          Ir a Kampus
        </Link>
      </div>
    </main>
  );
}
