import { subjectToPathSegment } from "@/lib/notebooks/paths";

export type CommunityResourceKind = "external" | "notebook";

export function buildNotebookResourceAttach(subject: string): {
  resourceUrl: string;
  resourceLabel: string;
  resourceKind: "notebook";
} {
  const slug = subjectToPathSegment(subject);
  return {
    resourceUrl: `/study/notebook/${slug}`,
    resourceLabel: `Cuaderno: ${subject.trim()}`,
    resourceKind: "notebook",
  };
}

export function isNotebookResourceUrl(url: string | null | undefined): boolean {
  const u = url?.trim() ?? "";
  return u.startsWith("/study/notebook/");
}

export function inferResourceKind(
  url: string | null | undefined,
  kind: CommunityResourceKind | null | undefined,
): CommunityResourceKind | null {
  if (kind === "notebook" || kind === "external") return kind;
  if (isNotebookResourceUrl(url)) return "notebook";
  if (url?.trim()) return "external";
  return null;
}
