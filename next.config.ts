import path from "path";
import type { NextConfig } from "next";

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

export default nextConfig;
