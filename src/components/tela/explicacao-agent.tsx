import { Info } from "lucide-react";
import type { ExplicacaoDecisao } from "@/domain/plano/tipos";
import { PorQueIsso } from "./por-que-isso";
import { Revelar } from "./revelar";

/**
 * A explicação que o agent produziu para uma decisão do plano, na
 * forma em que o atleta a encontra na tela.
 *
 * `PorQueIsso` responde *o que* é dito; este componente responde
 * *quando* e *com quanto peso*. A distinção importa porque a mesma
 * explicação aparece em telas com custos de atenção muito diferentes:
 * revisar o plano no sofá e conferir um exercício com a barra na mão
 * não pedem a mesma quantidade de texto na frente dos olhos.
 *
 * Existe para que esse julgamento seja tomado uma vez, aqui, e não
 * reinventado por cada tela — foi assim que a explicação acabou
 * visível só no onboarding.
 */

export function ExplicacaoAgent({
  pergunta,
  explicacao,
  apresentacao = "fechado",
  tom = "discreto",
}: {
  /**
   * Rótulo do disclosure, escrito como a pergunta que o atleta faria
   * ("Por que este exercício?"). Uma pergunta convida ao toque; um
   * substantivo ("Justificativa") só rotula uma gaveta.
   */
  pergunta: string;
  explicacao?: ExplicacaoDecisao;
  /**
   * Quanta atenção a explicação reivindica:
   *
   * - `fechado`: padrão. Custo zero de espaço, descoberta por toque.
   * - `aberto`: só quando o atleta está prestes a divergir do plano ou
   *   quando o plano acabou de mudar — o momento em que o motivo é a
   *   informação que muda a decisão, não um detalhe secundário.
   * - `icone`: telas sob carga física. Troca o chevron por `Info` e
   *   corta os pares campo/valor, porque entre séries o atleta lê uma
   *   frase, não uma tabela de origem.
   */
  apresentacao?: "fechado" | "aberto" | "icone";
  tom?: "discreto" | "forte";
}) {
  return (
    <Revelar
      rotulo={pergunta}
      tom={tom}
      aberto={apresentacao === "aberto"}
      Icone={apresentacao === "icone" ? Info : undefined}
    >
      <PorQueIsso explicacao={explicacao} compacto={apresentacao === "icone"} />
    </Revelar>
  );
}
