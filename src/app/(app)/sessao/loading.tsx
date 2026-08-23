import {
  Esqueleto,
  EsqueletoCabecalho,
  EsqueletoLista,
  EsqueletoTela,
} from "@/components/tela";

/**
 * Cobre a aba de treino e suas rotas filhas (`[id]`, `historico`,
 * `previa`): todas carregam a sessão ou o histórico do banco. Fica no
 * segmento pai porque a silhueta — cabeçalho, bloco de destaque e lista
 * de exercícios — é a mesma nas três.
 */
export default function CarregandoSessao() {
  return (
    <EsqueletoTela rotulo="Carregando o treino">
      <EsqueletoCabecalho />
      <div className="px-6">
        <Esqueleto className="h-24 w-full rounded-xl" />
      </div>
      <EsqueletoLista itens={4} />
    </EsqueletoTela>
  );
}
