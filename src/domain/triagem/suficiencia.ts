import {
  ETAPAS_TRIAGEM,
  type EtapaId,
  type RespostasTriagem,
} from "./etapas";

/**
 * Uma etapa está respondida quando todos os seus campos existem em
 * `respostas` — `undefined`/campo ausente é "não visitada", qualquer
 * outro valor (incluindo string vazia ou array vazio) é uma resposta
 * explícita de "nenhum(a)" (specs/mvp-vertical.md, user story 6).
 */
export function etapaRespondida(
  etapaId: EtapaId,
  respostas: RespostasTriagem,
): boolean {
  const etapa = ETAPAS_TRIAGEM.find((e) => e.id === etapaId);
  if (!etapa) return false;
  return etapa.campos.every((campo) => respostas[campo] !== undefined);
}

export interface ResultadoSuficiencia {
  /**
   * Modo Conservador (specs/mvp-vertical.md): ativo enquanto qualquer
   * etapa obrigatória não tiver sido respondida.
   */
  modoConservador: boolean;
  /** Perfil não tem nenhuma etapa (obrigatória ou complementar) pendente. */
  completo: boolean;
  etapasObrigatoriasFaltantes: EtapaId[];
  etapasComplementaresFaltantes: EtapaId[];
}

export function avaliarSuficiencia(
  respostas: RespostasTriagem,
): ResultadoSuficiencia {
  const faltantes = ETAPAS_TRIAGEM.filter(
    (etapa) => !etapaRespondida(etapa.id, respostas),
  );

  const etapasObrigatoriasFaltantes = faltantes
    .filter((e) => e.obrigatoria)
    .map((e) => e.id);
  const etapasComplementaresFaltantes = faltantes
    .filter((e) => !e.obrigatoria)
    .map((e) => e.id);

  return {
    modoConservador: etapasObrigatoriasFaltantes.length > 0,
    completo: faltantes.length === 0,
    etapasObrigatoriasFaltantes,
    etapasComplementaresFaltantes,
  };
}

/**
 * Próxima etapa não respondida, na ordem canônica da cascata — o que
 * permite retomar exatamente de onde o usuário parou (specs/mvp-
 * vertical.md, user story 5).
 */
export function proximaEtapaPendente(
  respostas: RespostasTriagem,
): EtapaId | null {
  const proxima = ETAPAS_TRIAGEM.find(
    (etapa) => !etapaRespondida(etapa.id, respostas),
  );
  return proxima?.id ?? null;
}
