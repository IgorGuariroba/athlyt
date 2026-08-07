"use client";

import { useState, useTransition } from "react";
import { ChevronDown, Info } from "lucide-react";
import { Button } from "@/components/ui/button";

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
 */

const LADO_MAXIMO = 1600;
const QUALIDADE = 0.85;

/** Acima disso o corpo estoura mesmo depois da redução — avisa em vez de falhar mudo. */
const LIMITE_ENVIO_BYTES = 8 * 1024 * 1024;

const POSES = [
  { nome: "frente", rotulo: "Frente", dica: "Braços levemente afastados do tronco, palmas para frente." },
  { nome: "costas", rotulo: "Costas", dica: "De costas para a câmera, mesma distância e mesmo enquadramento." },
  { nome: "lateralDireita", rotulo: "Lateral direita", dica: "Perfil direito, braços soltos ao lado do corpo." },
  { nome: "lateralEsquerda", rotulo: "Lateral esquerda", dica: "Perfil esquerdo, na mesma postura do lado direito." },
] as const;

const GUIA = [
  "Mesma distância da câmera e o corpo inteiro no enquadramento.",
  "Luz vinda da frente, sem contraluz nem sombra forte de lado.",
  "Roupa justa ou mínima, sempre parecida entre as sessões.",
  "Postura relaxada e respiração normal, sem estufar nem contrair.",
] as const;

/**
 * `imageOrientation: "from-image"` aplica o EXIF antes do desenho: sem
 * isso, uma foto de retrato tirada na horizontal chegaria deitada ao
 * servidor, que já removeu o metadado e não teria como corrigir.
 */
async function reduzirParaEnvio(arquivo: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return arquivo;

  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: "from-image" });
    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    const largura = Math.round(bitmap.width * escala);
    const altura = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = largura;
    canvas.height = altura;
    const contexto = canvas.getContext("2d");
    if (!contexto) return arquivo;
    contexto.drawImage(bitmap, 0, 0, largura, altura);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALIDADE),
    );
    if (!blob || blob.size >= arquivo.size) return arquivo;

    return new File([blob], `${arquivo.name.replace(/\.[^.]+$/, "")}.webp`, {
      type: "image/webp",
    });
  } catch {
    // Navegador sem suporte a WebP no canvas ou arquivo ilegível: o
    // original ainda pode caber, e o servidor continua validando.
    return arquivo;
  }
}

export function EnvioFotos({
  action,
}: {
  action: (fd: FormData) => Promise<void>;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const [preparando, setPreparando] = useState(false);
  const [enviando, iniciarEnvio] = useTransition();
  const ocupado = preparando || enviando;

  async function aoEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const dados = new FormData(formulario);
    setErro(null);
    setPreparando(true);

    try {
      let total = 0;
      let escolhidas = 0;

      for (const { nome } of POSES) {
        const arquivo = dados.get(nome);
        if (!(arquivo instanceof File) || arquivo.size === 0) {
          dados.delete(nome);
          continue;
        }
        escolhidas += 1;
        const reduzido = await reduzirParaEnvio(arquivo);
        total += reduzido.size;
        dados.set(nome, reduzido, reduzido.name);
      }

      if (escolhidas === 0) {
        setErro("Selecione ao menos uma foto.");
        return;
      }
      if (total > LIMITE_ENVIO_BYTES) {
        setErro("As fotos somam mais do que o envio suporta. Envie em duas etapas.");
        return;
      }

      iniciarEnvio(async () => {
        await action(dados);
      });
    } finally {
      setPreparando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} className="flex flex-1 flex-col gap-6">
      {erro ? (
        <p
          role="alert"
          className="rounded-xl border border-error/40 bg-surface-container px-4 py-3 text-body-sm text-error"
        >
          {erro}
        </p>
      ) : null}

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
          <label className="flex flex-col gap-1.5 text-label-md text-on-surface">
            Condições
            <input
              id="condicoes"
              name="condicoes"
              placeholder="Iluminação, distância ou observações"
              className="h-12 w-full rounded-lg border border-border bg-surface-container px-3 text-body-md text-on-surface placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-label-md text-on-surface">
            Retenção
            <select
              id="retencaoDias"
              name="retencaoDias"
              className="h-12 w-full rounded-lg border border-border bg-surface-container px-3 text-body-md text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="0">Até eu excluir</option>
              <option value="365">Excluir após 1 ano</option>
              <option value="730">Excluir após 2 anos</option>
            </select>
          </label>
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

      <Button size="lg" type="submit" disabled={ocupado} className="h-12 w-full">
        {preparando
          ? "Preparando fotos…"
          : enviando
            ? "Enviando…"
            : "Enviar para storage privado"}
      </Button>
    </form>
  );
}
