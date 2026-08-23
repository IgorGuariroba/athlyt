import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/** Boletim corporal: agrega medições e tendências antes de renderizar. */
export default function CarregandoProgresso() {
  return (
    <EsqueletoTela rotulo="Carregando o boletim corporal">
      <EsqueletoCabecalho />
      <EsqueletoLista itens={3} />
    </EsqueletoTela>
  );
}
