import { cn } from "@/lib/utils";

/**
 * Bloco de carregamento necessário para dados remotos.
 *
 * O esqueleto existe para reservar espaço, não para entreter: usa a
 * superfície de container e um pulso único, sem shimmer em gradiente.
 * O que ele promete é a *geometria* do conteúdo que vem — por isso a
 * altura é sempre explícita no ponto de uso, e nunca um valor médio
 * arbitrário embutido aqui.
 *
 * `aria-hidden` é deliberado: quem anuncia o carregamento para leitores
 * de tela é a região viva de `EsqueletoTela`, uma vez, e não cada uma
 * das dezenas de barras que compõem a silhueta.
 */
export function Esqueleto({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse rounded-md bg-surface-container-high",
        className,
      )}
    />
  );
}

/**
 * Moldura de `loading.tsx`: silhueta do conteúdo mais o anúncio textual
 * do carregamento.
 *
 * `role="status"` com `aria-live="polite"` faz o leitor de tela dizer o
 * rótulo quando a rota entra em suspensão — a contrapartida acessível
 * do pulso visual. O texto fica visualmente oculto porque, na tela, a
 * própria silhueta já comunica a espera; duplicá-la com a palavra
 * "carregando" só adiciona ruído ao layout que estamos reservando.
 */
export function EsqueletoTela({
  rotulo = "Carregando",
  className,
  children,
}: {
  /** O que está sendo carregado, para leitores de tela. */
  rotulo?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex w-full flex-col gap-4", className)}
    >
      <span className="sr-only">{rotulo}</span>
      {children}
    </div>
  );
}

/**
 * Silhueta do `CabecalhoTela` — contexto, título e descrição — com o
 * mesmo espaçamento do cabeçalho real, para que a transição do
 * esqueleto para o conteúdo não desloque a primeira linha da tela.
 */
export function EsqueletoCabecalho({
  comDescricao = true,
  className,
}: {
  comDescricao?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 px-6 pt-8 pb-6", className)}>
      <Esqueleto className="h-4 w-24" />
      <Esqueleto className="h-8 w-3/4" />
      {comDescricao ? <Esqueleto className="h-4 w-full max-w-sm" /> : null}
    </div>
  );
}

/**
 * Silhueta de uma lista de cartões — o formato mais comum do produto
 * (histórico, refeições, medições, trilhas).
 */
export function EsqueletoLista({
  itens = 3,
  className,
}: {
  itens?: number;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 px-6", className)}>
      {Array.from({ length: itens }, (_, indice) => (
        <Esqueleto key={indice} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}
