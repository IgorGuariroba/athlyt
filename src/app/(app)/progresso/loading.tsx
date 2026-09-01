import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/**
 * Fallback de suspense do segmento `/progresso` — vale também para as
 * subrotas de revisão, que não têm `loading.tsx` próprio.
 */
export default function CarregandoProgresso() {
  return (
    <EsqueletoTela rotulo="Carregando progresso">
      <EsqueletoCabecalho />
      <EsqueletoLista itens={3} />
    </EsqueletoTela>
  );
}
