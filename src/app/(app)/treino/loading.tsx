import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/** Fallback prefetchável da aba Treino. */
export default function CarregandoTreino() {
  return (
    <EsqueletoTela className="min-h-full" rotulo="Carregando treino">
      <EsqueletoCabecalho comDescricao={false} />
      <EsqueletoLista itens={4} />
    </EsqueletoTela>
  );
}
