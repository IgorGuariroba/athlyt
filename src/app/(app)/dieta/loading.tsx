import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/** Fallback prefetchável da aba Dieta. */
export default function CarregandoDieta() {
  return (
    <EsqueletoTela className="min-h-full" rotulo="Carregando dieta">
      <EsqueletoCabecalho />
      <EsqueletoLista itens={4} />
    </EsqueletoTela>
  );
}
