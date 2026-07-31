import { RadioGroup } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoRadio } from "../_components/opcao-cartao";

const NIVEIS = [
  {
    value: "sedentario",
    label: "Sedentário",
    descricao: "Pouco ou nenhum movimento além do básico",
  },
  {
    value: "leve",
    label: "Leve",
    descricao: "Caminhadas ocasionais ou trabalho pouco ativo",
  },
  {
    value: "moderado",
    label: "Moderado",
    descricao: "Movimento regular ao longo do dia",
  },
  {
    value: "ativo",
    label: "Ativo",
    descricao: "Rotina com bastante deslocamento ou esforço",
  },
  {
    value: "muito-ativo",
    label: "Muito ativo",
    descricao: "Trabalho físico ou treinos diários intensos",
  },
] as const;

/**
 * Tela 023 — Rotina, sono e atividade
 * (specs/workflow/telas/023-rotina-sono.md).
 */
export default async function RotinaSonoPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("rotina-sono");

  return (
    <CascataShell titulo="Rotina, sono e atividade" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="rotina-sono"
        proximaEtapa={proximoDestinoCascata("rotina-sono")}
      >
        <div className="flex flex-col gap-3">
          <p className="text-label-md text-muted-foreground">
            Nível de atividade habitual
          </p>
          <RadioGroup
            name="nivelAtividade"
            defaultValue={respostas.nivelAtividade}
            required
            className="gap-3"
          >
            {NIVEIS.map((nivel) => (
              <CartaoRadio
                key={nivel.value}
                id={`nivel-${nivel.value}`}
                value={nivel.value}
                titulo={nivel.label}
                descricao={nivel.descricao}
              />
            ))}
          </RadioGroup>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="horasSono">Horas de sono por noite</Label>
          <Input
            id="horasSono"
            name="horasSono"
            type="number"
            inputMode="numeric"
            min={0}
            max={24}
            defaultValue={respostas.horasSono}
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
