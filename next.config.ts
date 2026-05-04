import path from "path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Dev only: use a separate folder so Windows/AV lock issues on `.next` are easier to recover from.
  // Production / Vercel must use the default `.next` so the platform finds the build output.
  ...(process.env.NODE_ENV === "development" ? { distDir: ".next-kampus" } : {}),
  devIndicators: false,
  // Next 16 locks `.next/dev/lock` via native bindings; on some Windows setups
  // (paths with spaces, AV, etc.) this throws ENOENT and kills `next dev`.
  experimental: {
    lockDistDir: false,
  },
  turbopack: {
    root: path.join(process.cwd()),
  },
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
      silent: !process.env.CI,
    })
  : nextConfig;
