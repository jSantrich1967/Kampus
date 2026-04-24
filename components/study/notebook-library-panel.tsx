"use client";

import { BookMarked, Loader2, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useKampus } from "@/components/kampus/kampus-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { sanitizeStorageFilename, subjectToPathSegment } from "@/lib/notebooks/paths";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { cn } from "@/lib/cn";

export type NotebookDocumentRow = {
  id: string;
  user_id: string;
  subject: string;
  storage_path: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  extracted_text: string | null;
  created_at: string;
  updated_at: string;
};

const MAX_BYTES = 50 * 1024 * 1024; // aligned with bucket limit in migration (50 MiB)

export function NotebookLibraryPanel() {
  const { profile, authUserId } = useKampus();
  const [subject, setSubject] = useState(profile.subjects[0] ?? "");
  const [customSubject, setCustomSubject] = useState("");
  const [docs, setDocs] = useState<NotebookDocumentRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customSubject.trim()) return;
    const first = profile.subjects[0];
    if (first && !subject.trim()) setSubject(first);
  }, [profile.subjects, customSubject, subject]);

  const effectiveSubject = useMemo(() => {
    const c = customSubject.trim();
    if (c) return c;
    return subject.trim() || "General";
  }, [customSubject, subject]);

  const loadDocs = useCallback(async () => {
    if (!isSupabaseConfigured() || !authUserId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { data, error: qErr } = await supabase
        .from("notebook_documents")
        .select("*")
        .eq("user_id", authUserId)
        .order("created_at", { ascending: false });
      if (qErr) throw qErr;
      setDocs((data as NotebookDocumentRow[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los archivos.");
    } finally {
      setLoading(false);
    }
  }, [authUserId]);

  useEffect(() => {
    void loadDocs();
  }, [loadDocs]);

  async function uploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !authUserId) return;
    if (!isSupabaseConfigured()) {
      setError("Supabase no está configurado.");
      return;
    }
    setUploading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const segment = subjectToPathSegment(effectiveSubject);

    try {
      for (const file of Array.from(fileList)) {
        if (file.size > MAX_BYTES) {
          throw new Error(`“${file.name}” supera el límite de ${MAX_BYTES / 1024 / 1024} MB.`);
        }

        let extractedText: string | null = null;
        try {
          const fd = new FormData();
          fd.append("files", file);
          const res = await fetch("/api/rescue/extract", { method: "POST", body: fd });
          const json = (await res.json()) as { combinedText?: string; error?: string };
          if (res.ok && json.combinedText?.trim()) {
            extractedText = json.combinedText.trim();
          }
        } catch {
          // Extraction is optional; upload still proceeds
        }

        const safeName = sanitizeStorageFilename(file.name);
        const storagePath = `${authUserId}/${segment}/${crypto.randomUUID()}_${safeName}`;

        const { error: upErr } = await supabase.storage.from("notebooks").upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });
        if (upErr) throw upErr;

        const { error: insErr } = await supabase.from("notebook_documents").insert({
          user_id: authUserId,
          subject: effectiveSubject,
          storage_path: storagePath,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          size_bytes: file.size,
          extracted_text: extractedText,
        });
        if (insErr) {
          await supabase.storage.from("notebooks").remove([storagePath]);
          throw insErr;
        }
      }
      await loadDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al subir.");
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(doc: NotebookDocumentRow) {
    if (!authUserId) return;
    setError(null);
    const supabase = createSupabaseBrowserClient();
    try {
      const { error: rmErr } = await supabase.storage.from("notebooks").remove([doc.storage_path]);
      if (rmErr) throw rmErr;
      const { error: delErr } = await supabase.from("notebook_documents").delete().eq("id", doc.id).eq("user_id", authUserId);
      if (delErr) throw delErr;
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo borrar.");
    }
  }

  async function signedDownload(doc: NotebookDocumentRow) {
    const supabase = createSupabaseBrowserClient();
    const { data, error: uErr } = await supabase.storage.from("notebooks").createSignedUrl(doc.storage_path, 3600);
    if (uErr || !data?.signedUrl) {
      setError(uErr?.message ?? "No se pudo generar el enlace de descarga.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (!isSupabaseConfigured()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-300" />
            Mis cuadernos por materia
          </CardTitle>
          <CardDescription>
            Configura Supabase en el proyecto para guardar archivos en la nube (misma cuenta que el login).
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!authUserId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5 text-indigo-300" />
            Mis cuadernos por materia
          </CardTitle>
          <CardDescription>Inicia sesión para subir PDFs, imágenes o apuntes y reutilizarlos después (no se pierden al recargar).</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookMarked className="h-5 w-5 text-indigo-300" />
          Mis cuadernos por materia
        </CardTitle>
        <CardDescription>
          Los archivos se guardan en tu cuenta (Storage privado). Opcionalmente extraemos texto al subir para búsquedas y rescates futuros.
        </CardDescription>
      </CardHeader>

      <div className="space-y-4 px-6 pb-6">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-slate-400">Materia (desde tu perfil)</span>
            <select
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-slate-200 outline-none ring-indigo-400/40 focus:ring"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              {(profile.subjects.length ? profile.subjects : ["General"]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-slate-400">Otra materia (opcional)</span>
            <input
              className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 outline-none ring-indigo-400/40 focus:ring"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Ej. Econometría II"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-500/20 px-4 py-2 text-sm font-medium text-indigo-100 ring-1 ring-indigo-400/30 hover:bg-indigo-500/30">
            <Upload className="h-4 w-4" />
            {uploading ? "Subiendo…" : "Subir archivos"}
            <input
              type="file"
              className="hidden"
              multiple
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,application/pdf,image/*,text/plain,text/markdown"
              disabled={uploading}
              onChange={(e) => void uploadFiles(e.target.files)}
            />
          </label>
          <Button type="button" variant="secondary" size="sm" onClick={() => void loadDocs()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Actualizar lista
          </Button>
          <Badge tone="neutral">Materia activa: {effectiveSubject}</Badge>
        </div>

        {error ? <p className="text-sm text-rose-300">{error}</p> : null}

        <div className="space-y-2">
          {docs.length === 0 && !loading ? (
            <p className="text-sm text-slate-500">Aún no hay archivos. Sube un PDF o una foto de tus apuntes.</p>
          ) : null}
          {docs.map((doc) => (
            <div
              key={doc.id}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-slate-950/40 px-3 py-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-white">{doc.filename}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>{doc.subject}</span>
                  <span>·</span>
                  <span>{(doc.size_bytes / 1024 / 1024).toFixed(2)} MB</span>
                  <span>·</span>
                  <span>{new Date(doc.created_at).toLocaleString("es")}</span>
                </div>
                {doc.extracted_text ? (
                  <details className="mt-2 text-xs text-slate-400">
                    <summary className="cursor-pointer text-indigo-200/90">Texto extraído (vista previa)</summary>
                    <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950/80 p-2 text-slate-300">
                      {doc.extracted_text.slice(0, 2000)}
                      {doc.extracted_text.length > 2000 ? "…" : ""}
                    </pre>
                  </details>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button type="button" size="sm" variant="secondary" onClick={() => void signedDownload(doc)}>
                  Descargar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className={cn("text-rose-300 hover:bg-rose-500/10")}
                  onClick={() => void removeDoc(doc)}
                  aria-label={`Eliminar ${doc.filename}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
