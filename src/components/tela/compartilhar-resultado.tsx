"use client";

import { Share2, Trophy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AvisoAcao } from "./aviso-acao";

type Props = {
  nome: string;
  duracaoMin: number;
  totalSeries: number;
  volumeKg: number;
  recordes: Array<{ nome: string; valor: number }>;
  exercicios: Array<{ nome: string }>;
};

type Simbolo = "tempo" | "series" | "volume" | "estrela" | "marca";

function token(nome: string, alternativa: string) {
  if (typeof document === "undefined") return alternativa;
  return (
    getComputedStyle(document.documentElement).getPropertyValue(nome).trim() ||
    alternativa
  );
}

/**
 * `--font-brand` guarda uma cadeia de `var()`, que o Canvas não resolve.
 * Medir a família em um nó real com a utilitária aplicada devolve a
 * lista já expandida pelo navegador, com o nome gerado pelo next/font.
 */
function familia(classe: string, alternativa: string) {
  if (typeof document === "undefined") return alternativa;
  const no = document.createElement("span");
  no.className = classe;
  no.style.position = "absolute";
  no.style.visibility = "hidden";
  document.body.appendChild(no);
  const valor = getComputedStyle(no).fontFamily;
  no.remove();
  return valor || alternativa;
}

function textoCard(props: Props) {
  return `Treino concluído: ${props.nome} · ${props.duracaoMin} min · ${props.totalSeries} séries · ${props.volumeKg} kg de volume`;
}

function quebrar(
  ctx: CanvasRenderingContext2D,
  texto: string,
  maximo: number,
  limite: number,
) {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let linha = "";
  for (const palavra of palavras) {
    const candidata = linha ? `${linha} ${palavra}` : palavra;
    if (ctx.measureText(candidata).width > maximo && linha) {
      linhas.push(linha);
      linha = palavra;
    } else linha = candidata;
  }
  if (linha) linhas.push(linha);
  return linhas.slice(0, limite);
}

/**
 * Card 9:16 para Stories.
 *
 * A composição é um painel de vidro alinhado à esquerda ocupando cerca de
 * dois terços da largura: o lado direito fica livre porque a arte é feita
 * para ser sobreposta a uma foto no Instagram — daí o fundo transparente.
 * A hierarquia desce em kicker → título display → régua → métricas
 * empilhadas → cartão de conquista → rodapé de largura total.
 */
async function gerarCard(props: Props) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");

  const fonteInterface = familia("font-sans", "sans-serif");
  const fonteMarca = familia("font-brand", fonteInterface);
  const superficie = token("--surface", "rgb(23, 23, 23)");
  const fundo = token("--background", "rgb(17, 17, 17)");
  const forte = token("--on-surface-strong", "rgb(255, 255, 255)");
  const mutado = token("--muted-color", "rgb(128, 128, 128)");
  const acento = token("--success", "rgb(102, 185, 138)");
  const traco = token("--border-color", "rgb(52, 52, 52)");

  const espacar = (valor: string) => {
    try {
      ctx.letterSpacing = valor;
    } catch {
      /* Navegador sem letterSpacing no Canvas: o layout continua válido. */
    }
  };
  const comAlpha = (alpha: number, desenhar: () => void) => {
    ctx.globalAlpha = alpha;
    desenhar();
    ctx.globalAlpha = 1;
  };
  const painel = (
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    alpha: number,
    cor: string,
  ) => {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    comAlpha(alpha, () => {
      ctx.fillStyle = cor;
      ctx.fill();
    });
    comAlpha(0.9, () => {
      ctx.strokeStyle = traco;
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  };
  const disco = (x: number, y: number, r: number, cor: string, alpha = 1) =>
    comAlpha(alpha, () => {
      ctx.fillStyle = cor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  const rotulo = (
    texto: string,
    x: number,
    y: number,
    tamanho: number,
    cor: string,
    espaco: string,
  ) => {
    ctx.fillStyle = cor;
    ctx.font = `600 ${tamanho}px ${fonteInterface}`;
    espacar(espaco);
    ctx.fillText(texto, x, y);
    espacar("0px");
  };
  const simbolo = (x: number, y: number, tipo: Simbolo, escala: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(escala, escala);
    ctx.strokeStyle = acento;
    ctx.fillStyle = acento;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    if (tipo === "tempo") {
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.moveTo(0, -6.5);
      ctx.lineTo(0, 0.6);
      ctx.lineTo(5.5, 4.5);
    }
    if (tipo === "series") {
      ctx.moveTo(-11, -6);
      ctx.lineTo(11, -6);
      ctx.moveTo(-11, 0);
      ctx.lineTo(11, 0);
      ctx.moveTo(-11, 6);
      ctx.lineTo(11, 6);
    }
    if (tipo === "volume") {
      ctx.moveTo(-12.5, -6);
      ctx.lineTo(-12.5, 6);
      ctx.moveTo(-8, -9);
      ctx.lineTo(-8, 9);
      ctx.moveTo(-8, 0);
      ctx.lineTo(8, 0);
      ctx.moveTo(8, -9);
      ctx.lineTo(8, 9);
      ctx.moveTo(12.5, -6);
      ctx.lineTo(12.5, 6);
    }
    if (tipo === "marca") {
      ctx.moveTo(-9, -9);
      ctx.lineTo(9, 9);
      ctx.moveTo(9, -9);
      ctx.lineTo(-9, 9);
      ctx.moveTo(-10, 0);
      ctx.lineTo(10, 0);
    }
    if (tipo === "estrela") {
      for (let i = 0; i < 5; i += 1) {
        const externo = (i * 2 * Math.PI) / 5 - Math.PI / 2;
        const interno = externo + Math.PI / 5;
        const px = Math.cos(externo) * 12;
        const py = Math.sin(externo) * 12;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        ctx.lineTo(Math.cos(interno) * 5.2, Math.sin(interno) * 5.2);
      }
      ctx.closePath();
    }
    ctx.stroke();
    ctx.restore();
  };

  const painelX = 56;
  const painelLargura = 648;
  const painelTopo = 193;
  const painelBase = 1642;
  const conteudoX = painelX + 58;
  const conteudoDireita = painelX + painelLargura - 58;
  const conteudoLargura = conteudoDireita - conteudoX;

  // Vidro: translúcido o bastante para a foto aparecer, opaco o bastante
  // para o texto ter contraste sem depender do que estiver atrás.
  painel(
    painelX,
    painelTopo,
    painelLargura,
    painelBase - painelTopo,
    52,
    0.82,
    superficie,
  );

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Kicker: selo da marca + caixa alta muito espaçada.
  disco(conteudoX + 18, 300, 26, acento, 0.18);
  simbolo(conteudoX + 18, 300, "marca", 0.95);
  rotulo("TREINO CONCLUÍDO", conteudoX + 62, 311, 27, forte, "8px");

  // Título display: caixa alta, duas linhas, corpo ajustado à coluna.
  let tamanhoTitulo = 104;
  let titulo: string[] = [];
  for (; tamanhoTitulo >= 62; tamanhoTitulo -= 4) {
    ctx.font = `700 ${tamanhoTitulo}px ${fonteMarca}`;
    espacar("-2px");
    titulo = quebrar(ctx, props.nome.toUpperCase(), conteudoLargura, 2);
    const cabe = titulo.every(
      (linha) => ctx.measureText(linha).width <= conteudoLargura,
    );
    if (cabe) break;
  }
  ctx.fillStyle = forte;
  const alturaLinha = Math.round(tamanhoTitulo * 0.99);
  const baseTitulo = titulo.length > 1 ? 469 : 520;
  titulo.forEach((linha, i) =>
    ctx.fillText(linha, conteudoX, baseTitulo + i * alturaLinha),
  );
  espacar("0px");

  // Régua curta: acento no trecho cheio, trilho apagado no resto.
  ctx.lineCap = "round";
  ctx.lineWidth = 7;
  ctx.strokeStyle = traco;
  ctx.beginPath();
  ctx.moveTo(conteudoX, 674);
  ctx.lineTo(conteudoX + 232, 674);
  ctx.stroke();
  ctx.strokeStyle = acento;
  ctx.beginPath();
  ctx.moveTo(conteudoX, 674);
  ctx.lineTo(conteudoX + 156, 674);
  ctx.stroke();

  // Métricas empilhadas: disco com ícone, rótulo espaçado, valor enorme e
  // unidade em acento, separadas por divisórias finas.
  const metricas: Array<[string, string, string, Simbolo]> = [
    [
      "VOLUME TOTAL",
      props.volumeKg.toLocaleString("pt-BR"),
      "KG",
      "volume",
    ],
    ["DURAÇÃO", `${props.duracaoMin}`, "MIN", "tempo"],
    ["SÉRIES", `${props.totalSeries}`, "TOTAL", "series"],
  ];
  const passo = 213;
  metricas.forEach(([nome, valor, unidade, tipo], indice) => {
    const centro = 810 + indice * passo;
    if (indice > 0) {
      comAlpha(0.75, () => {
        ctx.strokeStyle = traco;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(conteudoX, centro - 107);
        ctx.lineTo(conteudoDireita, centro - 107);
        ctx.stroke();
      });
    }
    disco(conteudoX + 44, centro, 44, acento, 0.18);
    simbolo(conteudoX + 44, centro, tipo, 1.75);

    const textoX = conteudoX + 120;
    rotulo(nome, textoX, centro - 30, 25, mutado, "6px");
    ctx.fillStyle = forte;
    ctx.font = `700 74px ${fonteMarca}`;
    espacar("-1px");
    ctx.fillText(valor, textoX, centro + 37);
    const larguraValor = ctx.measureText(valor).width;
    espacar("0px");
    rotulo(unidade, textoX + larguraValor + 18, centro + 37, 27, acento, "4px");
  });

  // Cartão de conquista: recorde quando existe, registro do treino quando não.
  const cartaoX = conteudoX - 12;
  const cartaoLargura = conteudoLargura + 32;
  const cartaoY = 1349;
  const cartaoAltura = 240;
  comAlpha(0.14, () => {
    ctx.fillStyle = acento;
    ctx.beginPath();
    ctx.roundRect(cartaoX, cartaoY, cartaoLargura, cartaoAltura, 32);
    ctx.fill();
  });
  comAlpha(0.5, () => {
    ctx.strokeStyle = acento;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(cartaoX, cartaoY, cartaoLargura, cartaoAltura, 32);
    ctx.stroke();
  });

  const medalhaX = cartaoX + 86;
  const medalhaY = cartaoY + 128;
  disco(medalhaX, medalhaY, 50, acento, 0.2);
  ctx.strokeStyle = acento;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(medalhaX, medalhaY, 50, 0, Math.PI * 2);
  ctx.stroke();
  simbolo(medalhaX, medalhaY, "estrela", 2);

  const conquistaX = cartaoX + 168;
  const conquistaLargura = cartaoX + cartaoLargura - 34 - conquistaX;
  const temRecorde = props.recordes.length > 0;
  rotulo(
    temRecorde ? "RECORDE DESBLOQUEADO" : "TREINO REGISTRADO",
    conquistaX,
    cartaoY + 77,
    21,
    mutado,
    "4px",
  );
  ctx.fillStyle = forte;
  ctx.font = `700 40px ${fonteMarca}`;
  const destaque = (
    temRecorde ? props.recordes[0].nome : props.nome
  ).toUpperCase();
  ctx.fillText(
    quebrar(ctx, destaque, conquistaLargura, 1)[0] ?? "",
    conquistaX,
    cartaoY + 124,
  );

  ctx.fillStyle = mutado;
  ctx.font = `500 28px ${fonteInterface}`;
  const apoio = temRecorde
    ? `${props.recordes[0].valor} kg. Novo melhor resultado.`
    : `${props.exercicios.length} exercícios. Constância registrada.`;
  quebrar(ctx, apoio, conquistaLargura, 2).forEach((linha, i) =>
    ctx.fillText(linha, conquistaX, cartaoY + 172 + i * 41),
  );

  // Rodapé de largura total, fora do painel: assinatura da peça.
  comAlpha(0.92, () => {
    ctx.fillStyle = fundo;
    ctx.fillRect(0, 1830, 1080, 90);
  });
  simbolo(80, 1876, "marca", 1.15);
  comAlpha(0.6, () => {
    ctx.strokeStyle = traco;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(122, 1856);
    ctx.lineTo(122, 1896);
    ctx.stroke();
  });
  rotulo("CONSTÂNCIA CONSTRÓI ATLETAS", 152, 1886, 25, mutado, "6px");
  ctx.textAlign = "right";
  rotulo("#ATHLYT", 1024, 1886, 25, acento, "6px");
  ctx.textAlign = "left";

  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Falha ao gerar card")),
      "image/png",
    ),
  );
}

/** Card visual 9:16, transparente e com margens seguras para Stories. */
export function CompartilharResultado(props: Props) {
  const [mensagem, setMensagem] = useState<string | null>(null);

  const metricas: Array<[string, string, string]> = [
    ["Volume total", props.volumeKg.toLocaleString("pt-BR"), "kg"],
    ["Duração", `${props.duracaoMin}`, "min"],
    ["Séries", `${props.totalSeries}`, "total"],
  ];
  const temRecorde = props.recordes.length > 0;

  async function compartilhar() {
    try {
      const imagem = await gerarCard(props);
      const arquivo = new File([imagem], "athlyt-treino.png", {
        type: "image/png",
      });
      if (
        navigator.share &&
        (!navigator.canShare || navigator.canShare({ files: [arquivo] }))
      ) {
        await navigator.share({
          title: "Treino concluído",
          text: textoCard(props),
          files: [arquivo],
        });
        return;
      }
      const url = URL.createObjectURL(imagem);
      const link = document.createElement("a");
      link.href = url;
      link.download = arquivo.name;
      link.click();
      URL.revokeObjectURL(url);
      setMensagem("Card salvo. Abra o Instagram para publicar nos Stories.");
    } catch {
      setMensagem("Não foi possível compartilhar agora");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Prévia: mesma composição do canvas em escala reduzida. */}
      <div
        aria-hidden="true"
        className="mx-auto flex aspect-[9/16] w-60 flex-col overflow-hidden rounded-2xl"
      >
        <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-border bg-surface/85 p-3 pr-8">
          <div className="flex items-center gap-1.5">
            <Trophy aria-hidden="true" className="size-3 text-success" />
            <span className="text-caption font-semibold tracking-[0.2em] text-on-surface-strong uppercase">
              Treino concluído
            </span>
          </div>
          <p className="font-brand text-title leading-[0.95] font-bold tracking-tight uppercase">
            {props.nome}
          </p>
          <span className="flex h-1 w-16 overflow-hidden rounded-pill bg-border">
            <span className="h-full w-2/3 rounded-pill bg-success" />
          </span>
          <div className="mt-1 flex flex-col">
            {metricas.map(([nome, valor, unidade], indice) => (
              <div
                key={nome}
                className={`flex items-center gap-2 py-1.5 ${indice > 0 ? "border-t border-border" : ""}`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success/15 text-success">
                  <Trophy aria-hidden="true" className="size-3" />
                </span>
                <span className="flex flex-col leading-none">
                  <span className="text-caption tracking-[0.18em] text-muted-foreground uppercase">
                    {nome}
                  </span>
                  <span className="font-brand text-title font-bold">
                    {valor}
                    <span className="text-caption ml-1 font-semibold tracking-widest text-success uppercase">
                      {unidade}
                    </span>
                  </span>
                </span>
              </div>
            ))}
          </div>
          <div className="mt-auto flex items-center gap-2 rounded-xl border border-success/40 bg-success/10 p-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-success/60 bg-success/15 text-success">
              <Trophy aria-hidden="true" className="size-3.5" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-caption tracking-[0.18em] text-muted-foreground uppercase">
                {temRecorde ? "Recorde desbloqueado" : "Treino registrado"}
              </span>
              <span className="text-body-sm truncate font-bold uppercase">
                {temRecorde ? props.recordes[0].nome : props.nome}
              </span>
            </span>
          </div>
        </div>
        <div className="flex items-center justify-between bg-background px-3 py-1.5">
          <span className="text-caption tracking-[0.18em] text-muted-foreground uppercase">
            Athlyt
          </span>
          <span className="text-caption tracking-[0.18em] text-success uppercase">
            #athlyt
          </span>
        </div>
      </div>
      <Button type="button" size="lg" className="w-full" onClick={compartilhar}>
        <Share2 aria-hidden="true" />
        Compartilhar no Instagram
      </Button>
      {mensagem ? (
        <AvisoAcao tipo="sucesso">
          <Trophy aria-hidden="true" className="inline size-4" /> {mensagem}
        </AvisoAcao>
      ) : null}
    </div>
  );
}
