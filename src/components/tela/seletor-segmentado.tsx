"use client";

import { cn } from "@/lib/utils";

/**
 * Segmented control de estado local, irmão de `ControleSegmentado`.
 *
 * A diferença entre os dois é de onde vive o estado, e ela não é
 * cosmética: `ControleSegmentado` navega por `Link` porque o que ele
 * alterna pertence à URL. Aqui o que se alterna é uma **preferência de
 * execução** — ritmo de descanso entre séries, por exemplo — que não
 * deve recarregar a tela nem entrar no histórico do navegador: o
 * atleta está no meio de uma sessão e uma navegação a cada toque
 * custaria um render inteiro e perderia o foco.
 *
 * A semântica é de `radiogroup` com `input type="radio"` nativo (mesmo
 * motivo do `ChipSelecao`): o alvo clicável é o segmento inteiro, o
 * grupo já vem com navegação por setas e leitura de "opção 2 de 3", e
 * o valor viaja no `FormData` quando o seletor estiver dentro de um
 * formulário.
 *
 * Cada segmento mantém 44px de altura mínima, acima dos 32–36px da
 * referência visual, porque este controle é tocado com a mão suada
 * entre séries.
 *
 * O `input` é esticado sobre o segmento (`absolute inset-0 opacity-0`)
 * em vez de `sr-only`: escondido, ele vira uma caixa de 1px que não
 * cobre o alvo, e o toque cai no `label` — que reencaminha o clique,
 * mas deixa de ser o próprio controle o alvo atingido. Isso quebra
 * hit-testing (Playwright acusa "label intercepts pointer events") e,
 * em toque real, encolhe a área que responde a arrasto. Esticando o
 * input, o alvo de 44px é o controle de verdade.
 */
export function SeletorSegmentado<T extends string>({
  rotulo,
  name,
  valor,
  opcoes,
  aoMudar,
  className,
}: {
  /** Nome acessível do grupo — o que está sendo escolhido. */
  rotulo: string;
  /** Nome do grupo de radios; precisa ser único na tela. */
  name: string;
  valor: T;
  opcoes: readonly {
    valor: T;
    rotulo: string;
    /** Nome acessível do segmento, quando o rótulo visual não basta (ex.: "1:30"). */
    descricao?: string;
  }[];
  aoMudar: (valor: T) => void;
  className?: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      className={cn(
        "flex items-center gap-1 rounded-pill border border-border bg-surface-container p-1",
        className,
      )}
    >
      {opcoes.map((opcao) => (
        <label
          key={opcao.valor}
          className={cn(
            "relative flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-pill px-3 text-label-md tabular-nums transition-colors",
            "has-[input:focus-visible]:ring-3 has-[input:focus-visible]:ring-ring/50",
            opcao.valor === valor
              ? "bg-surface-container-high text-on-surface-strong"
              : "text-muted-foreground",
          )}
        >
          <input
            type="radio"
            name={name}
            value={opcao.valor}
            checked={opcao.valor === valor}
            onChange={() => aoMudar(opcao.valor)}
            aria-label={opcao.descricao}
            className="absolute inset-0 m-0 cursor-pointer appearance-none rounded-pill opacity-0"
          />
          <span className="pointer-events-none">{opcao.rotulo}</span>
        </label>
      ))}
    </div>
  );
}
