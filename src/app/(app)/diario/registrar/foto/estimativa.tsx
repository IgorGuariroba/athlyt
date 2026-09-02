"use client";

import { useState, useTransition } from "react";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvisoAcao, CabecalhoSecao, EstadoVazio } from "@/components/tela";
import { CapturaFoto } from "@/components/fotos/captura-foto";
import { reduzirImagemParaEnvio } from "@/components/fotos/reduzir-imagem";
import { RevisaoEstimativa } from "@/components/diario/revisao-estimativa";
import { useRevisaoEstimativa } from "@/components/diario/use-revisao-estimativa";
import type {
  ResultadoComItens,
  ResultadoTranscricaoAcrescimo,
} from "@/components/diario/acrescentar-alimento";
import type {
  RefeicaoEstimadaNaTela,
  ResultadoEstimativa,
  ResultadoMacrosItem,
} from "./actions";

/**
 * Registro por foto via IA.
 *
 * O fluxo tem exatamente três estados e nenhum a mais, porque o
 * caminho que ele existe para servir é "não quero editar nada, só
 * fotografar": **capturar → revisar → registrar**. A revisão não é
 * formulário: os campos já vêm preenchidos e o atleta só toca no que
 * estiver errado — que é quase sempre a porção, não o alimento.
 *
 * A estimativa nunca é gravada sozinha. A IA propõe e o atleta
 * confirma: registrar direto tornaria o número irrevisável justo onde
 * a incerteza é maior. Uma estimativa não pode se passar por medição;
 * por isso cada item mostra sua confiança e as
 * limitações da leitura ficam visíveis antes do botão, não depois.
 *
 * A revisão é a **mesma** de texto e áudio (`RevisaoEstimativa`).
 * Antes esta tela tinha uma lista própria onde o alimento era texto
 * fixo: dava para corrigir 250 g para 300 g, mas não para dizer que
 * a Coca-Cola da foto era a zero. E é justamente na foto que o modelo
 * mais erra o alimento — ele vê a garrafa e não lê o rótulo. Duas
 * revisões diferentes para o mesmo ato deixavam o caminho mais
 * suscetível ao erro com menos meios de corrigi-lo.
 */
export function RegistroPorFoto({
  dia,
  fuso,
  horaInicial,
  refeicaoRef,
  nomeInicial,
  estimar,
  estimarDescricao,
  transcrever,
  registrar,
  recalcularItem,
}: {
  dia: string;
  fuso: string;
  horaInicial: string;
  refeicaoRef?: string | null;
  nomeInicial?: string;
  estimar: (fd: FormData) => Promise<ResultadoEstimativa>;
  /** Acréscimo por texto durante a revisão; a foto reusa `estimar`. */
  estimarDescricao?: (fd: FormData) => Promise<ResultadoComItens>;
  transcrever?: (fd: FormData) => Promise<ResultadoTranscricaoAcrescimo>;
  registrar: (fd: FormData) => Promise<void>;
  /** Recalcula um item cujo alimento o atleta corrigiu na revisão. */
  recalcularItem?: (fd: FormData) => Promise<ResultadoMacrosItem>;
}) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [observacao, setObservacao] = useState("");
  const [estimativa, setEstimativa] = useState<RefeicaoEstimadaNaTela | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [analisando, setAnalisando] = useState(false);
  const [registrando, iniciarRegistro] = useTransition();

  const revisao = useRevisaoEstimativa({ recalcularItem, aoErrar: setErro });
  const { itens } = revisao;

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
      revisao.reiniciar(resultado.estimativa.itens);
      setNome(resultado.estimativa.nome);
    } catch {
      setErro("Falha de conexão durante o envio da foto. Tente novamente.");
    } finally {
      setAnalisando(false);
    }
  }

  function recomecar() {
    setEstimativa(null);
    revisao.reiniciar([]);
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
      {/* A instrução não fala mais em "gramas": a lista traz bebida em
          mililitros, e o que se corrige também pode ser o alimento. */}
      <CabecalhoSecao
        titulo="Confira antes de registrar"
        descricao="Corrija o que estiver fora — alimento ou quantidade. O resto já está pronto."
      />

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
        <RevisaoEstimativa
          itens={itens}
          aoMudar={revisao.aoMudarItens}
          nomesEstimados={revisao.nomesEstimados}
          aoRecalcularItem={recalcularItem ? revisao.recalcular : undefined}
          limitacoes={estimativa.limitacoes}
          confianca={estimativa.confianca}
          origemEstimativa="foto"
          acrescimo={
            estimarDescricao
              ? {
                  dia,
                  estimarDescricao,
                  // A mesma leitura de foto do registro inicial: o que
                  // muda é o destino dos itens, não a pergunta.
                  estimarFoto: estimar,
                  transcrever,
                }
              : undefined
          }
        />
      )}

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
