import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

import { KampusProvider } from "@/components/kampus/kampus-provider";

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
    default: "Kampus",
    template: "%s · Kampus",
  },
  description: "El sistema operativo académico para estudiantes, docentes e instituciones.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="min-h-dvh antialiased">
        <KampusProvider>{children}</KampusProvider>
      </body>
    </html>
  );
}
