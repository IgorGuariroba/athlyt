"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";

import {
  aplicarInercia,
  arredondarAoPasso,
  indiceDoValor,
  indiceMaximo,
  janelaDeIndices,
  limitarPosicao,
  suavizarEncaixe,
  valorDoIndice,
  velocidadeDasAmostras,
} from "./roleta-valor.logica";

export type EixoRoleta = "x" | "y";

type Props = {
  eixo: EixoRoleta;
  minimo: number;
  maximo: number;
  passo: number;
  /**
   * Valor inicial. A roleta é não-controlada: depois da montagem, a posição
   * pertence ao gesto. Para reposicioná-la de fora, remonte-a com `key`.
   */
  valorInicial: number;
  aoMudar: (valor: number) => void;
  /** Rótulo textual do tique; retorne `null` para desenhar só o traço. */
  formatarRotulo: (valor: number) => string | null;
  /** Texto lido por leitores de tela para o valor corrente. */
  descreverValor: (valor: number) => string;
  rotulo: string;
  /** Distância entre tiques, em pixels. Define a "marcha" do gesto. */
  passoPx?: number;
  className?: string;
};

const RAIO_JANELA = 60;
const DURACAO_ENCAIXE_MS = 180;
const AMOSTRAS_VELOCIDADE = 5;

/**
 * Régua rolável com física de tambor: arrasto 1:1 com o dedo, inércia ao
 * soltar e encaixe no tique mais próximo.
 *
 * O componente guarda a posição fracionária em `posicaoRef` e apenas notifica
 * o pai a cada tique cruzado. O desenho sai dessa posição via `transform`
 * aplicado por referência — fora do ciclo de render — para que o movimento
 * acompanhe o ponteiro sem custar um render por pixel. React só re-renderiza
 * quando o tique sob a agulha muda, que é exatamente quando algo discreto
 * (valor, destaque, janela) precisa mudar.
 */
export function RoletaValor({
  eixo,
  minimo,
  maximo,
  passo,
  valorInicial,
  aoMudar,
  formatarRotulo,
  descreverValor,
  rotulo,
  passoPx = 28,
  className,
}: Props) {
  const horizontal = eixo === "x";
  const indiceMax = indiceMaximo(minimo, maximo, passo);

  const pista = useRef<HTMLDivElement | null>(null);
  const posicaoRef = useRef(
    limitarPosicao(
      Math.round(indiceDoValor(valorInicial, minimo, passo)),
      indiceMaximo(minimo, maximo, passo),
    ),
  );
  const arraste = useRef<{ coordenada: number; posicao: number } | null>(null);
  const amostras = useRef<Array<{ posicao: number; tempo: number }>>([]);
  const animacao = useRef<number | null>(null);
  const rodaPendente = useRef(0);
  /**
   * Alvo lógico dos ajustes discretos (teclado/roda). Sem ele, dois toques em
   * sequência rápida partiriam ambos da mesma posição ainda-não-animada e o
   * segundo passo seria engolido.
   */
  const alvoDiscreto = useRef<number | null>(null);

  const [indiceDestaque, setIndiceDestaque] = useState(() =>
    limitarPosicao(
      Math.round(indiceDoValor(valorInicial, minimo, passo)),
      indiceMaximo(minimo, maximo, passo),
    ),
  );

  const desenhar = useCallback(() => {
    const elemento = pista.current;
    if (!elemento) return;
    const deslocamento = -posicaoRef.current * passoPx;
    elemento.style.transform = horizontal
      ? `translate3d(${deslocamento}px, 0, 0)`
      : `translate3d(0, ${deslocamento}px, 0)`;
  }, [horizontal, passoPx]);

  /**
   * Publica a posição corrente: redesenha sempre, mas só avisa o formulário
   * (e vibra) quando o tique sob a agulha realmente mudou.
   */
  const publicar = useCallback(
    (posicao: number) => {
      posicaoRef.current = limitarPosicao(posicao, indiceMax);
      desenhar();

      const indice = Math.round(posicaoRef.current);
      if (indice === indiceDestaque) return;
      setIndiceDestaque(indice);
      aoMudar(valorDoIndice(indice, minimo, passo));
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate?.(6);
      }
    },
    [aoMudar, desenhar, indiceDestaque, indiceMax, minimo, passo],
  );

  const pararAnimacao = useCallback(() => {
    if (animacao.current !== null) {
      cancelAnimationFrame(animacao.current);
      animacao.current = null;
    }
  }, []);

  /** Anima do ponto atual até o tique mais próximo (ou um alvo explícito). */
  const encaixar = useCallback(
    (alvoIndice?: number) => {
      const origem = posicaoRef.current;
      const destino = limitarPosicao(
        alvoIndice ?? Math.round(origem),
        indiceMax,
      );
      if (origem === destino) {
        publicar(destino);
        alvoDiscreto.current = null;
        return;
      }
      const inicio = performance.now();
      const passoAnimacao = (agora: number) => {
        const progresso = (agora - inicio) / DURACAO_ENCAIXE_MS;
        if (progresso >= 1) {
          animacao.current = null;
          publicar(destino);
          if (alvoDiscreto.current === destino) alvoDiscreto.current = null;
          return;
        }
        publicar(origem + (destino - origem) * suavizarEncaixe(progresso));
        animacao.current = requestAnimationFrame(passoAnimacao);
      };
      animacao.current = requestAnimationFrame(passoAnimacao);
    },
    [indiceMax, publicar],
  );

  const lancar = useCallback(
    (velocidadeInicial: number) => {
      let velocidade = velocidadeInicial;
      let anterior = performance.now();
      const passoAnimacao = (agora: number) => {
        const dt = Math.min(32, agora - anterior);
        anterior = agora;
        const passoFisico = aplicarInercia(
          posicaoRef.current,
          velocidade,
          dt,
          indiceMax,
        );
        velocidade = passoFisico.velocidade;
        publicar(passoFisico.posicao);
        if (passoFisico.terminou) {
          animacao.current = null;
          encaixar();
          return;
        }
        animacao.current = requestAnimationFrame(passoAnimacao);
      };
      animacao.current = requestAnimationFrame(passoAnimacao);
    },
    [encaixar, indiceMax, publicar],
  );

  function iniciarArraste(evento: PointerEvent<HTMLDivElement>) {
    pararAnimacao();
    alvoDiscreto.current = null;
    const coordenada = horizontal ? evento.clientX : evento.clientY;
    arraste.current = { coordenada, posicao: posicaoRef.current };
    amostras.current = [
      { posicao: posicaoRef.current, tempo: performance.now() },
    ];
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function arrastar(evento: PointerEvent<HTMLDivElement>) {
    const inicio = arraste.current;
    if (!inicio) return;
    const coordenada = horizontal ? evento.clientX : evento.clientY;
    // O sinal inverte por eixo: arrastar para a esquerda (ou para cima)
    // traz valores maiores para a agulha, como numa régua física.
    const posicao = inicio.posicao + (inicio.coordenada - coordenada) / passoPx;
    publicar(posicao);

    amostras.current.push({
      posicao: posicaoRef.current,
      tempo: performance.now(),
    });
    if (amostras.current.length > AMOSTRAS_VELOCIDADE) amostras.current.shift();
  }

  function terminarArraste(evento: PointerEvent<HTMLDivElement>) {
    if (!arraste.current) return;
    arraste.current = null;
    evento.currentTarget.releasePointerCapture(evento.pointerId);
    const velocidade = velocidadeDasAmostras(amostras.current);
    amostras.current = [];
    if (velocidade === 0) encaixar();
    else lancar(velocidade);
  }

  function ajustarComTeclado(evento: KeyboardEvent<HTMLDivElement>) {
    const direcao =
      evento.key === "ArrowUp" || evento.key === "ArrowRight"
        ? 1
        : evento.key === "ArrowDown" || evento.key === "ArrowLeft"
          ? -1
          : 0;
    if (direcao === 0) return;
    evento.preventDefault();
    pararAnimacao();
    const base = alvoDiscreto.current ?? Math.round(posicaoRef.current);
    const alvo = limitarPosicao(base + direcao, indiceMax);
    alvoDiscreto.current = alvo;
    encaixar(alvo);
  }

  function ajustarComRoda(evento: WheelEvent<HTMLDivElement>) {
    evento.preventDefault();
    pararAnimacao();
    // O delta é acumulado em pixels para que rodas de passo fino também
    // consigam mover a régua, em vez de perderem frações no arredondamento.
    rodaPendente.current += -evento.deltaY;
    const tiques = Math.trunc(rodaPendente.current / passoPx);
    if (tiques === 0) return;
    rodaPendente.current -= tiques * passoPx;
    const base = alvoDiscreto.current ?? Math.round(posicaoRef.current);
    const alvo = limitarPosicao(base + tiques, indiceMax);
    alvoDiscreto.current = alvo;
    encaixar(alvo);
  }

  // O transform vive fora do React (é escrito a cada pointermove), então
  // precisa ser reaplicado após qualquer render que recrie a pista.
  useLayoutEffect(desenhar);

  useEffect(() => pararAnimacao, [pararAnimacao]);

  const valorAtual = arredondarAoPasso(
    valorDoIndice(indiceDestaque, minimo, passo),
    passo,
  );
  const indices = janelaDeIndices(indiceDestaque, RAIO_JANELA, indiceMax);
  const mascara = horizontal
    ? "linear-gradient(to right, transparent, black 18%, black 82%, transparent)"
    : "linear-gradient(to bottom, transparent, black 18%, black 82%, transparent)";

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={rotulo}
      aria-valuemin={minimo}
      aria-valuemax={maximo}
      aria-valuenow={valorAtual}
      aria-valuetext={descreverValor(valorAtual)}
      aria-orientation={horizontal ? "horizontal" : "vertical"}
      onPointerDown={iniciarArraste}
      onPointerMove={arrastar}
      onPointerUp={terminarArraste}
      onPointerCancel={terminarArraste}
      onKeyDown={ajustarComTeclado}
      onWheel={ajustarComRoda}
      className={`relative touch-none overflow-hidden select-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-border-strong ${
        horizontal ? "cursor-ew-resize" : "cursor-ns-resize"
      } ${className ?? ""}`}
    >
      <div
        className="pointer-events-none absolute"
        style={
          horizontal
            ? { left: "50%", top: 0, bottom: 0, width: 0 }
            : { top: "50%", left: 0, right: 0, height: 0 }
        }
      >
        <div
          className="absolute rounded-full bg-on-surface-strong"
          style={
            horizontal
              ? { left: -1.5, width: 3, top: "12%", bottom: "12%" }
              : { top: -1.5, height: 3, left: "12%", right: "12%" }
          }
        />
      </div>

      <div
        className="pointer-events-none absolute inset-0"
        style={{ maskImage: mascara, WebkitMaskImage: mascara }}
      >
        <div
          ref={pista}
          className="absolute will-change-transform"
          style={
            horizontal
              ? { left: "50%", top: 0, bottom: 0, width: 0 }
              : { top: "50%", left: 0, right: 0, height: 0 }
          }
        >
          {indices.map((indice) => {
            const valorDoTique = valorDoIndice(indice, minimo, passo);
            const texto = formatarRotulo(valorDoTique);
            const destacado = indice === indiceDestaque;
            const posicaoPx = indice * passoPx;

            return (
              <div
                key={indice}
                className="absolute flex items-center justify-center"
                style={
                  horizontal
                    ? {
                        left: posicaoPx,
                        top: 0,
                        bottom: 0,
                        width: passoPx,
                        transform: "translateX(-50%)",
                        flexDirection: "column",
                      }
                    : {
                        top: posicaoPx,
                        left: 0,
                        right: 0,
                        height: passoPx,
                        transform: "translateY(-50%)",
                        flexDirection: "row",
                      }
                }
              >
                <div
                  className={`shrink-0 rounded-full transition-colors duration-150 ${
                    destacado
                      ? "bg-on-surface-strong"
                      : texto
                        ? "bg-border-strong"
                        : "bg-border"
                  }`}
                  style={
                    horizontal
                      ? { width: 2, height: texto ? 40 : 22 }
                      : { height: 2, width: texto ? 40 : 22 }
                  }
                />
                {texto ? (
                  <span
                    className={`text-body-sm tabular-nums whitespace-nowrap transition-colors duration-150 ${
                      destacado ? "font-semibold text-on-surface" : "text-muted-foreground"
                    } ${horizontal ? "mt-3" : "ml-3"}`}
                  >
                    {texto}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
