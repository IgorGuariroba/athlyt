import type { Metadata, Viewport } from "next";
import { Archivo, DM_Sans } from "next/font/google";
import { SerwistProvider } from "@serwist/next/react";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

/**
 * Fonte de marca (DESIGN.md > Typography). O MacroFactor usa duas
 * famílias com papéis separados: `Macro Sans` em display/headlines e
 * DM Sans em todo o resto — confirmado por inspeção de
 * `macrofactor.com`, que serve `MacroSans-VF.ttf` para h2/h3 e
 * `dm-sans-normal-latin.woff2` para parágrafos, listas e botões.
 *
 * `Macro Sans` é proprietária da marca MacroFactor: não está no Google
 * Fonts nem é licenciável, então usá-la aqui seria uso indevido.
 * Archivo é a substituta mais próxima disponível sob OFL — grotesca
 * com eixo de largura variável, que reproduz a caixa larga e os
 * terminais retos dos títulos em caixa alta do app.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

export const metadata: Metadata = {
  title: "Athlyt",
  description: "Seu coach adaptativo pessoal de treino, alimentação e evolução corporal.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
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
