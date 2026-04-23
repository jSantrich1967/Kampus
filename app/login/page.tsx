"use client";

import { Suspense } from "react";

import { EmailAuthPanel } from "@/components/auth/email-auth-panel";

function LoginContent() {
  return <EmailAuthPanel mode="login" />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center text-slate-400">Cargando…</div>}>
      <LoginContent />
    </Suspense>
  );
}
