import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/**
 * Escala tipográfica declarada em `globals.css` como `--text-*`.
 * Precisa ser repetida aqui porque o tailwind-merge não lê
 * o CSS: sem isso ele classifica `text-label-lg` como cor de texto e,
 * ao mesclar com `text-primary-foreground`, descarta um dos dois de
 * forma silenciosa — foi assim que o CTA branco apareceu com texto
 * quase invisível em vez de escuro.
 */
const TIPOGRAFIA = [
  "display",
  "headline-lg",
  "headline-md",
  "title",
  "body-lg",
  "body-md",
  "body-sm",
  "label-lg",
  "label-md",
  "caption",
] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: [...TIPOGRAFIA] }],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
