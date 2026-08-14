import { Clock } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio-group";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "@/components/tela/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "@/components/tela/opcao-cartao";

const FAIXAS = [
  { value: "30", label: "30 minutos", descricao: "Sessões curtas e objetivas" },
  { value: "45", label: "45 minutos", descricao: "Bom equilíbrio entre volume e tempo" },
  { value: "60", label: "60 minutos", descricao: "Sessão completa com aquecimento" },
  { value: "90", label: "90 minutos", descricao: "Volume alto, para rotinas flexíveis" },
] as const;

/**
 * Tela 017 — Duração possível da sessão
 * (specs/workflow/telas/017-duracao-sessao.md).
 */
export default async function DuracaoSessaoPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("duracao-sessao");

  return (
    <CascataShell titulo="Quanto tempo por sessão?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="duracao-sessao"
        proximaEtapa={proximoDestinoCascata("duracao-sessao")}
      >
        <RadioGroup
          name="duracaoSessaoMin"
          defaultValue={respostas.duracaoSessaoMin?.toString()}
          required
          className="gap-3"
        >
          {FAIXAS.map((faixa) => (
            <CartaoRadio
              key={faixa.value}
              id={`duracao-${faixa.value}`}
              value={faixa.value}
              titulo={faixa.label}
              descricao={faixa.descricao}
              Icone={Clock}
            />
          ))}
        </RadioGroup>
      </EtapaForm>
    </CascataShell>
  );
}
