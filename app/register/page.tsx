"use client";

import { Suspense } from "react";

import { EmailAuthPanel } from "@/components/auth/email-auth-panel";

function RegisterContent() {
  return <EmailAuthPanel mode="register" />;
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-slate-400">Cargando…</div>}>
      <RegisterContent />
    </Suspense>
  );
}
