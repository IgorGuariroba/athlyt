"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AvisoAcao } from "@/components/tela/aviso-acao";
import { CampoSelecao } from "@/components/tela/campo-selecao";
import { campoTexto } from "@/lib/form-data";
import { reduzirImagemParaEnvio } from "./reduzir-imagem";

/** Janelas de retenção oferecidas para as fotos corporais. */
const RETENCAO = [
  { valor: "0", rotulo: "Até eu excluir" },
  { valor: "365", rotulo: "Excluir após 1 ano" },
  { valor: "730", rotulo: "Excluir após 2 anos" },
] as const;

/**
 * Fotos de celular chegam com 3 a 8 MB cada, e quatro poses somam
 * dezenas de MB. Server Actions do Next.js recusam o corpo acima de
 * `experimental.serverActions.bodySizeLimit` com um 413 que nunca
 * chega à action: a página não mostra erro nenhum e o clique parece
 * não fazer nada. Reduzir a imagem no navegador antes do envio é o
 * que mantém o corpo pequeno independentemente da câmera do usuário —
 * o limite do servidor vira apenas rede de segurança.
 *
 * A conversão aqui é só de transporte. O recorte canônico continua no
 * servidor (`prepararFotoCorporal`), que remove metadados e regrava em
 * WebP: o cliente não é fonte de confiança.
 *
 * O envio é fatiado: uma chamada de Server Action por pose, em
 * sequência. Quatro fotos em um único corpo estouravam o
 * `bodySizeLimit` e a tela pedia ao usuário que "enviasse em duas
 * etapas" — um detalhe de transporte vazando para o fluxo. Com uma
 * foto por requisição o corpo é pequeno por construção e o usuário
 * escolhe as quatro de uma vez.
 */

const POSES = [
  { nome: "frente", pose: "frente", rotulo: "Frente", dica: "Braços levemente afastados do tronco, palmas para frente." },
  { nome: "costas", pose: "costas", rotulo: "Costas", dica: "De costas para a câmera, mesma distância e mesmo enquadramento." },
  { nome: "lateralDireita", pose: "lateral_direita", rotulo: "Lateral direita", dica: "Perfil direito, braços soltos ao lado do corpo." },
  { nome: "lateralEsquerda", pose: "lateral_esquerda", rotulo: "Lateral esquerda", dica: "Perfil esquerdo, na mesma postura do lado direito." },
] as const;

const GUIA = [
  "Mesma distância da câmera e o corpo inteiro no enquadramento.",
  "Luz vinda da frente, sem contraluz nem sombra forte de lado.",
  "Roupa justa ou mínima, sempre parecida entre as sessões.",
  "Postura relaxada e respiração normal, sem estufar nem contrair.",
] as const;

export function EnvioFotos({
  action,
  destinoSucesso = "/triagem/avaliacao-corporal/fotos?sucesso=Fotos armazenadas de forma privada.",
}: {
  action: (fd: FormData) => Promise<{ ok: true } | { ok: false; erro: string }>;
  destinoSucesso?: string;
}) {
  const router = useRouter();
  const [erro, setErro] = useState<string | null>(null);
  const [progresso, setProgresso] = useState<{ feitas: number; total: number } | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [atualizando, iniciarAtualizacao] = useTransition();
  const ocupado = enviando || atualizando;

  async function aoEnviar(evento: React.SyntheticEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    setErro(null);

    const escolhidas = POSES.flatMap(({ nome, pose, rotulo }) => {
      const arquivo = dados.get(nome);
      return arquivo instanceof File && arquivo.size > 0
        ? [{ pose, rotulo, arquivo }]
        : [];
    });

    if (escolhidas.length === 0) {
      setErro("Selecione ao menos uma foto.");
      return;
    }

    const condicoes = campoTexto(dados, "condicoes");
    const retencaoDias = campoTexto(dados, "retencaoDias", "0");
    const consentimento = campoTexto(dados, "consentimentoArmazenamento");

    setEnviando(true);
    setProgresso({ feitas: 0, total: escolhidas.length });

    try {
      for (const [indice, { pose, rotulo, arquivo }] of escolhidas.entries()) {
        const reduzido = await reduzirImagemParaEnvio(arquivo);
        const corpo = new FormData();
        corpo.set("pose", pose);
        corpo.set("foto", reduzido, reduzido.name);
        corpo.set("condicoes", condicoes);
        corpo.set("retencaoDias", retencaoDias);
        corpo.set("consentimentoArmazenamento", consentimento);
        // Um único ato de consentir para a sequência inteira.
        if (indice === 0) corpo.set("registrarConsentimento", "sim");

        const resultado = await action(corpo);
        if (!resultado.ok) {
          // As anteriores já estão salvas: dizer qual falhou evita que
          // o usuário reenvie tudo do zero.
          setErro(
            indice === 0
              ? resultado.erro
              : `${resultado.erro} As ${indice} primeiras fotos já foram salvas; reenvie a partir de "${rotulo}".`,
          );
          return;
        }
        setProgresso({ feitas: indice + 1, total: escolhidas.length });
      }

      formulario.reset();
      iniciarAtualizacao(() => {
        router.replace(destinoSucesso);
        router.refresh();
      });
    } catch {
      setErro("Falha de conexão durante o envio. Tente novamente.");
    } finally {
      setEnviando(false);
      setProgresso(null);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-1 flex-col gap-6">
      <section className="overflow-hidden rounded-2xl border border-border bg-surface-container">
        <div className="flex flex-col gap-1.5 px-5 pt-4 pb-3">
          <strong className="text-title text-on-surface-strong">
            Quatro ângulos
          </strong>
          <span className="text-body-sm leading-relaxed text-muted-foreground">
            Frente, costas e as duas laterais. Cada ângulo é comparado sempre
            com ele mesmo ao longo do tempo.
          </span>
        </div>
        <div className="grid gap-px border-t border-border bg-border">
          {POSES.map(({ nome, rotulo, dica }) => (
            <div key={nome} className="flex flex-col gap-2 bg-background px-5 py-4">
              <label htmlFor={nome} className="text-label-lg text-on-surface-strong">
                {rotulo}
              </label>
              <span className="text-body-sm leading-relaxed text-muted-foreground">
                {dica}
              </span>
              <input
                id={nome}
                name={nome}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="w-full cursor-pointer rounded-lg border border-border bg-surface-container px-3 py-2.5 text-body-sm text-on-surface transition-colors file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-surface-container-high file:px-3 file:py-1.5 file:text-label-md file:text-on-surface-strong hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          ))}
        </div>
      </section>

      <section
        aria-label="Como padronizar as fotos"
        className="flex flex-col gap-2 rounded-2xl bg-surface-container px-5 py-4"
      >
        <strong className="text-label-lg text-on-surface-strong">
          Para repetir do mesmo jeito
        </strong>
        <ul className="flex flex-col gap-1.5">
          {GUIA.map((item) => (
            <li
              key={item}
              className="flex gap-2 text-body-sm leading-relaxed text-muted-foreground"
            >
              <span aria-hidden="true" className="text-on-surface">
                •
              </span>
              {item}
            </li>
          ))}
        </ul>
      </section>

      <details className="group overflow-hidden rounded-2xl border border-border bg-surface-container">
        <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-label-lg text-on-surface-strong [&::-webkit-details-marker]:hidden">
          Condições e retenção
          <span className="flex items-center gap-2 text-body-sm font-normal text-muted-foreground">
            Opcional
            <ChevronDown
              className="size-4 transition-transform group-open:rotate-180"
              aria-hidden="true"
            />
          </span>
        </summary>
        <div className="flex flex-col gap-4 border-t border-border bg-background px-5 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="condicoes">Condições</Label>
            <Input
              id="condicoes"
              name="condicoes"
              placeholder="Iluminação, distância ou observações"
              className="h-12 bg-surface-container text-body-md"
            />
          </div>
          <CampoSelecao
            id="retencaoDias"
            name="retencaoDias"
            rotulo="Retenção"
            opcoes={RETENCAO}
          />
        </div>
      </details>

      <label className="flex items-start gap-3 rounded-2xl border border-border bg-surface-container px-5 py-4">
        <input
          type="checkbox"
          name="consentimentoArmazenamento"
          value="sim"
          required
          className="mt-0.5 size-5 shrink-0 accent-on-surface-strong"
        />
        <span className="flex flex-col gap-1">
          <strong className="text-label-lg text-on-surface-strong">
            Armazenamento privado
          </strong>
          <span className="text-body-sm leading-relaxed text-muted-foreground">
            Autorizo armazenar estas fotos corporais no bucket privado
            Cloudflare R2 para comparação longitudinal. Este consentimento não
            autoriza análise por IA.
          </span>
        </span>
      </label>

      <div className="flex gap-3 rounded-xl bg-surface-container px-4 py-3 text-body-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
        <p>
          As fotos são reduzidas no seu aparelho antes do envio; metadados são
          removidos e os arquivos regravados em WebP no servidor.
        </p>
      </div>

      {/* O aviso fica colado ao botão: é aqui que o usuário está
          olhando quando envia, e no topo do formulário ele passaria
          despercebido nesta tela longa. */}
      {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}

      <Button size="lg" type="submit" disabled={ocupado} className="h-12 w-full">
        {progresso
          ? `Enviando ${progresso.feitas + 1} de ${progresso.total}…`
          : ocupado
            ? "Enviando…"
            : "Enviar para storage privado"}
      </Button>
    </form>
  );
}
