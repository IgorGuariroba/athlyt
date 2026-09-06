import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/** Fallback prefetchável do Diário e de suas subrotas. */
export default function CarregandoDiario() {
  return (
    <EsqueletoTela className="min-h-full" rotulo="Carregando diário">
      <EsqueletoCabecalho />
      <EsqueletoLista itens={5} />
    </EsqueletoTela>
  );
}
