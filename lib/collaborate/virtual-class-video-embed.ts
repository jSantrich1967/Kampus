export type VirtualClassVideoKind = "youtube" | "vimeo" | "direct" | "meet" | "zoom" | "none";

export type VirtualClassVideoResolve = {
  kind: VirtualClassVideoKind;
  /** Safe https URL for iframe when embeddable. */
  embedSrc: string | null;
  /** Link to open in new tab (Meet/Zoom or fallback). */
  openUrl: string | null;
  providerLabel: string | null;
};

function parseYoutubeId(url: URL): string | null {
  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.replace(/^\//, "").split("/")[0];
    return id || null;
  }
  if (url.hostname.includes("youtube.com")) {
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIdx = parts.indexOf("embed");
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1];
    const liveIdx = parts.indexOf("live");
    if (liveIdx >= 0 && parts[liveIdx + 1]) return parts[liveIdx + 1];
  }
  return null;
}

function parseVimeoId(url: URL): string | null {
  if (!url.hostname.includes("vimeo.com")) return null;
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts.find((p) => /^\d+$/.test(p));
  return id ?? null;
}

function safeHttpsUrl(raw: string | null | undefined): URL | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function resolveVirtualClassVideoEmbed(input: {
  embedVideoUrl?: string | null;
  joinUrl?: string | null;
}): VirtualClassVideoResolve {
  const embedUrl = safeHttpsUrl(input.embedVideoUrl);
  const joinUrl = safeHttpsUrl(input.joinUrl);

  const candidate = embedUrl ?? joinUrl;
  if (!candidate) {
    return { kind: "none", embedSrc: null, openUrl: null, providerLabel: null };
  }

  const ytId = parseYoutubeId(candidate);
  if (ytId) {
    return {
      kind: "youtube",
      embedSrc: `https://www.youtube.com/embed/${ytId}?rel=0`,
      openUrl: candidate.href,
      providerLabel: "YouTube",
    };
  }

  const vimeoId = parseVimeoId(candidate);
  if (vimeoId) {
    return {
      kind: "vimeo",
      embedSrc: `https://player.vimeo.com/video/${vimeoId}`,
      openUrl: candidate.href,
      providerLabel: "Vimeo",
    };
  }

  if (candidate.hostname.includes("meet.google.com")) {
    return {
      kind: "meet",
      embedSrc: null,
      openUrl: candidate.href,
      providerLabel: "Google Meet",
    };
  }

  if (candidate.hostname.includes("zoom.us") || candidate.hostname.includes("zoom.com")) {
    return {
      kind: "zoom",
      embedSrc: null,
      openUrl: candidate.href,
      providerLabel: "Zoom",
    };
  }

  if (embedUrl && (candidate.pathname.includes("/embed") || candidate.searchParams.has("embed"))) {
    return {
      kind: "direct",
      embedSrc: candidate.href,
      openUrl: joinUrl?.href ?? candidate.href,
      providerLabel: "Vídeo",
    };
  }

  if (embedUrl) {
    return {
      kind: "direct",
      embedSrc: candidate.href,
      openUrl: joinUrl?.href ?? candidate.href,
      providerLabel: "Vídeo",
    };
  }

  return {
    kind: "none",
    embedSrc: null,
    openUrl: candidate.href,
    providerLabel: null,
  };
}
