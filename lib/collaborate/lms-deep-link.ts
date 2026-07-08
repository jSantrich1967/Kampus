export type LmsProvider = "moodle" | "canvas" | "generic";

export type LmsIntegration = {
  provider: LmsProvider;
  baseUrl: string;
};

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return "";
  }
}

export function buildLmsCourseUrl(integration: LmsIntegration, courseExternalId: string): string | null {
  const id = courseExternalId.trim();
  const base = normalizeBaseUrl(integration.baseUrl);
  if (!base || !id) return null;

  switch (integration.provider) {
    case "moodle":
      return `${base}/course/view.php?id=${encodeURIComponent(id)}`;
    case "canvas":
      return `${base}/courses/${encodeURIComponent(id)}`;
    case "generic":
      return `${base}/${encodeURIComponent(id)}`;
    default:
      return null;
  }
}

export function lmsProviderLabel(provider: LmsProvider): string {
  switch (provider) {
    case "moodle":
      return "Moodle";
    case "canvas":
      return "Canvas";
    case "generic":
      return "LMS";
    default:
      return "LMS";
  }
}
