import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/** Fallback prefetchável da aba Mais e de suas configurações. */
export default function CarregandoMais() {
  return (
    <EsqueletoTela className="min-h-full" rotulo="Carregando configurações">
      <EsqueletoCabecalho comDescricao={false} />
      <EsqueletoLista itens={5} />
    </EsqueletoTela>
  );
}
