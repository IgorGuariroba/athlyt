import type { ExplicacaoDecisao } from "@/domain/plano/tipos";

/**
 * "Por que isso?" — a justificativa de uma decisão do plano junto dos
 * dados do atleta que a sustentam.
 *
 * Existe como componente único porque a confiança depende de a resposta
 * ter sempre a mesma forma: primeiro o motivo em linguagem direta,
 * depois a origem em pares campo/valor. Uma tela que escrevesse só o
 * texto deixaria o atleta sem saber de onde veio o número.
 *
 * Quando a explicação não existe — plano gravado antes desta fatia, já
 * imutável — o componente admite a lacuna em vez de inventar um motivo.
 */

const ROTULOS: Record<string, string> = {
  modoConservador: "Modo conservador",
  idadeAnos: "Idade",
  sexoBiologico: "Sexo biológico",
  alturaCm: "Altura",
  pesoKg: "Peso",
  experienciaTreino: "Experiência",
  diasDisponiveis: "Dias disponíveis",
  duracaoSessaoMin: "Duração da sessão",
  localTreino: "Local de treino",
  equipamentos: "Equipamentos",
  lesoes: "Lesões",
  condicoes: "Condições de saúde",
  restricoesAlimentares: "Restrições alimentares",
  horasSono: "Sono",
  nivelAtividade: "Nível de atividade",
  objetivoComposicao: "Objetivo",
  orcamentoAlimentar: "Orçamento",
  tempoPreparoMin: "Tempo de preparo",
  "triagem-completa": "Triagem",
  "fotos-corporais": "Fotos corporais",
  "linha-base-corporal": "Linha de base corporal",
  "metas-proporcao": "Metas de proporção",
  "historico-importado": "Histórico importado",
};

export function PorQueIsso({ explicacao }: { explicacao?: ExplicacaoDecisao }) {
  if (!explicacao) {
    return (
      <p>
        Este item foi gerado antes de o plano passar a registrar a explicação de
        cada escolha.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p>{explicacao.porque}</p>
      <ul className="flex flex-col gap-1">
        {explicacao.dadosUsados.map((dado) => (
          <li key={`${dado.campo}-${dado.valor}`} className="text-label-md">
            <span className="text-on-surface">
              {ROTULOS[dado.campo] ?? dado.campo}
            </span>
            : {dado.valor}
          </li>
        ))}
      </ul>
    </div>
  );
}
