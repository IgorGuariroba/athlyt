import { consolidarCircunferencia } from "./index";

/**
 * Avalia um lote de regiões medidas na mesma tela.
 *
 * Existe separado de `consolidarCircunferencia`, que julga uma região
 * isolada, porque a tela precisa saber de uma só vez **quais** regiões
 * falharam — e não parar na primeira, obrigando o usuário a descobrir
 * um problema por submissão.
 */

export interface EntradaRegiao {
  prefixo: string;
  leituras: number[];
}

export interface FalhaRegiao {
  prefixo: string;
  erro: string;
}

export interface ResultadoLote {
  validos: EntradaRegiao[];
  falhas: FalhaRegiao[];
}

export function avaliarLoteCircunferencias(
  regioes: readonly EntradaRegiao[],
): ResultadoLote {
  const validos: EntradaRegiao[] = [];
  const falhas: FalhaRegiao[] = [];

  for (const regiao of regioes) {
    // Região em branco não é erro: a coleta é parcial por desenho e o
    // usuário pode registrar só o que mediu agora.
    if (regiao.leituras.length === 0) continue;
    const resultado = consolidarCircunferencia(regiao.leituras);
    if (resultado.ok) {
      validos.push(regiao);
    } else {
      falhas.push({ prefixo: regiao.prefixo, erro: resultado.erro });
    }
  }

  return { validos, falhas };
}

/**
 * Mensagem única para o alerta do topo. Quando várias regiões falham,
 * a contagem evita repetir o mesmo texto e deixa claro o tamanho do
 * problema; o detalhe por região fica no próprio campo.
 */
export function mensagemDoLote(falhas: readonly FalhaRegiao[]): string {
  if (falhas.length === 0) return "";
  if (falhas.length === 1) return falhas[0]?.erro ?? "";
  return `Confira as medidas de ${falhas.length} regiões destacadas abaixo.`;
}
