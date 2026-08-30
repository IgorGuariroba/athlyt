"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvisoAcao, CabecalhoSecao, EstadoVazio } from "@/components/tela";
import { CapturaFoto } from "@/components/fotos/captura-foto";
import { reduzirImagemParaEnvio } from "@/components/fotos/reduzir-imagem";
import { removerDoPrato, reescalarItem, subtotalDoPrato, type ItemPrato } from "@/domain/alimentos/prato";
import { ROTULO_CONFIANCA_ESTIMATIVA } from "@/domain/alimentos/proveniencia";
import type { RefeicaoEstimadaNaTela, ResultadoEstimativa } from "./actions";

/**
 * Registro por foto (CONTEXT.md > Atalhos de Registro: "foto via IA").
 *
 * O fluxo tem exatamente três estados e nenhum a mais, porque o
 * caminho que ele existe para servir é "não quero editar nada, só
 * fotografar": **capturar → revisar → registrar**. A revisão não é
 * formulário: os campos já vêm preenchidos e o atleta só toca no que
 * estiver errado — que é quase sempre a porção, não o alimento.
 *
 * A estimativa nunca é gravada sozinha. A IA propõe e o atleta
 * confirma: registrar direto tornaria o número irrevisável justo onde
 * a incerteza é maior, e a user story 59 proíbe estimativa que se
 * passe por medição. Por isso cada item mostra sua confiança e as
 * limitações da leitura ficam visíveis antes do botão, não depois.
 */
export function RegistroPorFoto({
  dia,
  fuso,
  horaInicial,
  refeicaoRef,
  nomeInicial,
  estimar,
  registrar,
}: {
  dia: string;
  fuso: string;
  horaInicial: string;
  refeicaoRef?: string | null;
  nomeInicial?: string;
  estimar: (fd: FormData) => Promise<ResultadoEstimativa>;
  registrar: (fd: FormData) => Promise<void>;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [estimativa, setEstimativa] = useState<RefeicaoEstimadaNaTela | null>(null);
  const [itens, setItens] = useState<ItemPrato[]>([]);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [registrando, iniciarRegistro] = useTransition();

  const subtotal = subtotalDoPrato(itens);

  async function analisar() {
    if (!arquivo) return;
    setErro(null);
    setAnalisando(true);
    try {
      const reduzido = await reduzirImagemParaEnvio(arquivo, { ladoMaximo: 1280, qualidade: 0.8 });
      const corpo = new FormData();
      corpo.set("foto", reduzido, reduzido.name);
      corpo.set("dia", dia);
      corpo.set("observacao", observacao);

      const resultado = await estimar(corpo);
      if (!resultado.ok) {
        setErro(resultado.erro);
        return;
      }
      setEstimativa(resultado.estimativa);
      setItens(resultado.estimativa.itens);
      setNome(resultado.estimativa.nome);
    } catch {
      setErro("Falha de conexão durante o envio da foto. Tente novamente.");
    } finally {
      setAnalisando(false);
    }
  }

  function recomecar() {
    setEstimativa(null);
    setItens([]);
    setNome("");
    setArquivo(null);
    setObservacao("");
    setErro(null);
  }

  if (!estimativa) {
    return (
      <div className="flex flex-col gap-5">
        <CapturaFoto
          arquivo={arquivo}
          aoEscolher={(escolhido) => {
            setArquivo(escolhido);
            setErro(null);
          }}
          rotuloCaptura="Fotografar o prato"
          dica="Enquadre o prato inteiro, de cima. Um talher ou a mão ao lado ajudam a estimar o tamanho da porção."
        />

        {arquivo ? (
          <label className="flex flex-col gap-2">
            <span className="text-label-md text-muted-foreground">
              Quer contar algo sobre o prato? (opcional)
            </span>
            <Textarea
              value={observacao}
              onChange={(evento) => setObservacao(evento.target.value)}
              rows={2}
              placeholder="O arroz é integral, comi só metade do feijão…"
            />
          </label>
        ) : null}

        {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}

        {arquivo ? (
          <Button size="cta" onClick={analisar} disabled={analisando} className="w-full">
            <Sparkles className="size-5" aria-hidden="true" />
            {analisando ? "Lendo a foto…" : "Estimar calorias e macros"}
          </Button>
        ) : null}

        <p className="text-body-sm leading-relaxed text-muted-foreground">
          A foto vai ao provedor de IA apenas para esta estimativa e não é
          armazenada. Nada entra no Diário antes de você confirmar.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <CabecalhoSecao
        titulo="Confira antes de registrar"
        descricao="Ajuste as gramas do que estiver fora — o resto já está pronto."
      />

      {estimativa.limitacoes.length > 0 ? (
        <div className="flex gap-3 rounded-xl border border-border bg-surface-container px-4 py-3">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            <p className="text-label-md text-on-surface-strong">
              O que a foto não mostra ·{" "}
              {ROTULO_CONFIANCA_ESTIMATIVA[estimativa.confianca].toLowerCase()}
            </p>
            <ul className="flex flex-col gap-0.5 text-body-sm text-muted-foreground">
              {estimativa.limitacoes.map((limitacao) => (
                <li key={limitacao}>{limitacao}</li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {itens.length === 0 ? (
        <EstadoVazio
          titulo="Nada sobrou no prato"
          descricao="Você removeu todos os itens. Fotografe de novo ou volte aos outros atalhos."
          acao={
            <Button variant="ghost" onClick={recomecar}>
              Fotografar de novo
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {itens.map((item, indice) => (
            <li
              key={`${item.descricao}-${indice}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-container p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-label-lg text-on-surface-strong">
                  {item.descricao.replace(/\s\d+\s?g$/, "")}
                </p>
                <p className="text-caption tabular-nums text-muted-foreground">
                  {item.calorias} kcal · {item.proteinaG}P · {item.carboidratosG}C ·{" "}
                  {item.gordurasG}G · {ROTULO_CONFIANCA_ESTIMATIVA[item.confianca]}
                </p>
              </div>
              <label className="flex shrink-0 items-center gap-1">
                <span className="sr-only">Gramas de {item.descricao}</span>
                <Input
                  value={String(item.quantidade)}
                  inputMode="numeric"
                  aria-label={`Gramas de ${item.descricao}`}
                  onChange={(evento) => {
                    const gramas = Number(evento.target.value.replace(",", "."));
                    if (!Number.isFinite(gramas) || gramas <= 0) return;
                    setItens((atual) =>
                      atual.map((alvo, i) => (i === indice ? reescalarItem(alvo, gramas) : alvo)),
                    );
                  }}
                  className="h-11 w-16 text-center tabular-nums"
                />
                <span className="text-body-sm text-muted-foreground">g</span>
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remover ${item.descricao}`}
                onClick={() => setItens((atual) => removerDoPrato(atual, indice))}
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex items-baseline justify-between gap-3 rounded-xl bg-surface-container-high px-4 py-3">
        <span className="text-label-lg text-on-surface-strong">Total</span>
        <span className="text-body-sm tabular-nums text-muted-foreground">
          <strong className="text-on-surface-strong">{subtotal.calorias} kcal</strong> ·{" "}
          {subtotal.proteinaG}P · {subtotal.carboidratosG}C · {subtotal.gordurasG}G
        </span>
      </div>

      {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}

      <form
        action={(fd) => {
          fd.set("itens", JSON.stringify(itens));
          iniciarRegistro(() => {
            void registrar(fd);
          });
        }}
        className="flex flex-col gap-2"
      >
        <input type="hidden" name="dia" value={dia} />
        <input type="hidden" name="fuso" value={fuso} />
        <input type="hidden" name="refeicaoRef" value={refeicaoRef ?? ""} />
        <label className="flex flex-col gap-2"><span className="text-label-md text-muted-foreground">Horário</span><Input type="time" name="hora" defaultValue={horaInicial} aria-label="Horário da refeição" className="h-12" /></label>
        <label className="flex flex-col gap-2">
          <span className="text-label-md text-muted-foreground">Nome da refeição</span>
          <Input
            name="nome"
            value={nomeInicial && !nome ? nomeInicial : nome}
            onChange={(evento) => setNome(evento.target.value)}
            aria-label="Nome da refeição"
            className="h-12"
          />
        </label>
        <Button size="cta" type="submit" disabled={itens.length === 0 || registrando}>
          <Check className="size-5" aria-hidden="true" />
          {registrando ? "Registrando…" : "Registrar no Diário"}
        </Button>
        <Button type="button" variant="ghost" onClick={recomecar}>
          Fotografar de novo
        </Button>
      </form>
    </div>
  );
}
