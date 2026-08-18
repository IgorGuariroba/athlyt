import type { Metadata, Viewport } from "next";
import { SerwistProvider } from "@serwist/next/react";
import { archivo, dmSans } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Athlyt",
  description: "Seu coach adaptativo pessoal de treino, alimentação e evolução corporal.",
  manifest: "/manifest.webmanifest",
  /**
   * `statusBarStyle` fica em `black` (opaco), e não em
   * `black-translucent`.
   *
   * Translúcido significa "eu assumo a área da status bar", e o app
   * nunca assumiu: nenhuma tela consome `env(safe-area-inset-top)`.
   * Instalado na tela de início do iPhone, o resultado era o título de
   * cada aba desenhado atrás do relógio e da Dynamic Island.
   *
   * Pior: em standalone translúcido o iOS reporta uma viewport com a
   * altura da tela MENOS a status bar, porém ancorada em `y = 0`, e
   * zera todos os `safe-area-inset-*`. O casco `dvh` media 62pt a menos
   * que a tela e sobrava uma faixa morta sob a `BottomNav` — os mesmos
   * 62pt do inset superior, reaparecendo embaixo.
   *
   * Com `black`, o iOS posiciona a webview abaixo da status bar e a
   * geometria volta a fechar sem nenhum recorte manual.
   */
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Athlyt",
  },
};

export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${dmSans.variable} ${archivo.variable} h-full`}
    >
      <body className="min-h-dvh flex flex-col">
        <SerwistProvider swUrl="/sw.js" disable={process.env.NODE_ENV !== "production"}>
          {children}
        </SerwistProvider>
      </body>
    </html>
  );
}
