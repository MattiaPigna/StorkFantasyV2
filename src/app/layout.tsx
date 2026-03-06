import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/layout/providers";
import { SwRegister } from "@/components/layout/sw-register";

const inter = Inter({ subsets: ["latin"], display: "swap", preload: false });

export const metadata: Metadata = {
  title: "StorkLeague - Fantacalcio",
  description: "La tua lega di fantacalcio ufficiale. Gestisci la tua squadra, compra giocatori e scala la classifica.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "StorkLeague",
  },
};

export const viewport: Viewport = {
  themeColor: "#F97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it" className="dark">
      <body className={inter.className}>
        <Providers>
          <SwRegister />
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
