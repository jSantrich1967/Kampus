import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/** Opt-in flags (see `.env.example`). Defaults match Linux/macOS/Vercel/CI. */
function envFlag(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

function devDistDirFromEnv(): string | undefined {
  const raw = process.env.KAMPUS_NEXT_DIST_DIR?.trim();
  if (!raw || process.env.NODE_ENV !== "development") return undefined;
  return raw;
}

/** Pin Turbopack root to this package so Next does not pick a parent folder when multiple lockfiles exist. */
function turbopackRoot(): string {
  const raw = process.env.KAMPUS_TURBOPACK_ROOT?.trim();
  return raw ? path.resolve(process.cwd(), raw) : path.resolve(process.cwd());
}

const distDir = devDistDirFromEnv();

const nextConfig: NextConfig = {
  ...(distDir ? { distDir } : {}),
  devIndicators: false,
  ...(envFlag("KAMPUS_NEXT_DISABLE_DIST_LOCK")
    ? { experimental: { lockDistDir: false } }
    : {}),
  turbopack: { root: turbopackRoot() },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
    ],
  },
};

// Optional: upload source maps to Sentry during build (better stack traces in Issues).
// Requires SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT in the build environment (e.g. Vercel).
const hasSentrySourceMaps =
  Boolean(process.env.SENTRY_AUTH_TOKEN) &&
  Boolean(process.env.SENTRY_ORG) &&
  Boolean(process.env.SENTRY_PROJECT);

export default hasSentrySourceMaps
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG!,
      project: process.env.SENTRY_PROJECT!,
      authToken: process.env.SENTRY_AUTH_TOKEN,
      // In Vercel, keep logs visible so we can confirm source-map upload.
      silent: false,
      widenClientFileUpload: true,
      telemetry: false,
    })
  : nextConfig;
