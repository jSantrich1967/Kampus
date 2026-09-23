import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { KampusProvider } from "@/components/kampus/kampus-provider";
import { SwrProvider } from "@/components/providers/swr-provider";
import { SpeedInsights } from "@vercel/speed-insights/next";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Kampus · Plataforma educativa con IA",
    template: "%s · Kampus",
  },
  description: "El sistema operativo académico para estudiantes, docentes e instituciones.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Kampus",
    statusBarStyle: "black-translucent",
  },
};

/** Lets iOS / PWA expose `env(safe-area-inset-*)` for notched devices when used in CSS. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh antialiased">
        <KampusProvider>
          <SwrProvider>{children}</SwrProvider>
          <SpeedInsights />
        </KampusProvider>
      </body>
    </html>
  );
}
