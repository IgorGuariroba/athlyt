"use client";

const CHAVE_ULTIMA_ETAPA = "triagem:ultimo-indice";

/**
 * Anima a entrada de cada etapa da cascata no sentido do fluxo: da
 * direita ao avançar e da esquerda ao voltar.
 *
 * A direção não vem do evento de navegação — o avanço é um `redirect`
 * de server action e o retorno é um `<Link>`, dois caminhos que a
 * página de destino não distingue. Ela é derivada da posição da etapa
 * em relação à anterior, guardada em `sessionStorage` para sobreviver
 * à troca de documento e ficar restrita à aba.
 *
 * A correção da direção acontece no ref callback, não num efeito: o
 * callback roda no commit, antes do paint, então a animação já começa
 * no sentido certo. Um `useEffect` só rodaria depois do primeiro
 * quadro, deixando a etapa entrar brevemente pelo lado errado.
 */
export function TransicaoEtapa({
  indice,
  children,
}: {
  indice: number;
  children: React.ReactNode;
}) {
  function ajustarDirecao(elemento: HTMLDivElement | null) {
    if (!elemento) return;

    const anterior = Number(sessionStorage.getItem(CHAVE_ULTIMA_ETAPA));
    if (Number.isFinite(anterior) && anterior > indice) {
      elemento.dataset.direcao = "atras";
    }
    sessionStorage.setItem(CHAVE_ULTIMA_ETAPA, String(indice));
  }

  return (
    <div
      ref={ajustarDirecao}
      data-direcao="adiante"
      className="etapa-transicao flex flex-1 flex-col gap-6"
    >
      {children}
    </div>
  );
}
