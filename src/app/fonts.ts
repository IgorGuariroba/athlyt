import { Archivo, DM_Sans } from "next/font/google";

/**
 * Fontes compartilhadas pelo layout raiz e pelo limite global de erro.
 * `global-error.tsx` substitui o layout quando entra em cena, portanto
 * precisa aplicar as mesmas variáveis tipográficas por conta própria.
 *
 * O MacroFactor separa `Macro Sans` em headlines e DM Sans na interface.
 * Como `Macro Sans` é proprietária, Archivo cumpre o papel de marca sob
 * OFL, com o eixo de largura ajustado em `globals.css`.
 */
export const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});
