import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Avoid Windows EPERM locks on a stale `.next` folder (AV / other Node processes).
  distDir: ".next-kampus",
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
