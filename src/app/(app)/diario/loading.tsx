import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/**
 * O diário monta o dia inteiro (`montarDiarioDoDia`) antes de renderizar.
 * Sem este arquivo, a aba fica no conteúdo anterior durante a consulta e
 * a troca de dia parece travada.
 */
export default function CarregandoDiario() {
  return (
    <EsqueletoTela rotulo="Carregando o diário">
      <EsqueletoCabecalho />
      <EsqueletoLista itens={4} />
    </EsqueletoTela>
  );
}
