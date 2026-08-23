import {
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/**
 * `listarHistoricoSessoes` varre as sessões concluídas do atleta.
 *
 * Fica nesta folha, e não no segmento `sessao`: lá não existe
 * `page.tsx` — `/sessao` não é rota — e um `loading.tsx` no pai vira a
 * fronteira de Suspense de todas as filhas, incluindo a prévia, que
 * ficou presa nele por 30 s no E2E.
 */
export default function CarregandoHistorico() {
  return (
    <EsqueletoTela rotulo="Carregando o histórico de treinos">
      <EsqueletoCabecalho />
      <EsqueletoLista itens={5} />
    </EsqueletoTela>
  );
}
