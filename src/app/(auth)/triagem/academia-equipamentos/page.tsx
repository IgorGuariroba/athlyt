import { Building2, Dumbbell, Home } from "lucide-react";
import { RadioGroup } from "@/components/ui/radio-group";
import {
  EQUIPAMENTOS_DISPONIVEIS,
  posicaoNaCascata,
  proximoDestinoCascata,
} from "@/domain/triagem/etapas";
import { CascataShell } from "../_components/cascata-shell";
import { carregarRespostasTriagem } from "../_lib/carregar-respostas";
import { EtapaForm } from "../_components/etapa-form";
import { CartaoCheckbox, CartaoRadio } from "../_components/opcao-cartao";

const LOCAIS = [
  { value: "academia-completa", label: "Academia completa", Icone: Dumbbell },
  { value: "condominio", label: "Academia de condomínio", Icone: Building2 },
  { value: "casa", label: "Casa", Icone: Home },
] as const;

/**
 * Tela 018 — Academia e equipamentos
 * (specs/workflow/telas/018-academia-equipamentos.md).
 */
export default async function AcademiaEquipamentosPage() {
  const respostas = await carregarRespostasTriagem();
  const { indice, total } = posicaoNaCascata("academia-equipamentos");

  return (
    <CascataShell titulo="Onde você treina?" indice={indice} total={total}>
      <EtapaForm
        etapaAtual="academia-equipamentos"
        proximaEtapa={proximoDestinoCascata("academia-equipamentos")}
      >
        <RadioGroup
          name="localTreino"
          defaultValue={respostas.localTreino}
          required
          className="gap-3"
        >
          {LOCAIS.map((local) => (
            <CartaoRadio
              key={local.value}
              id={`local-${local.value}`}
              value={local.value}
              titulo={local.label}
              Icone={local.Icone}
            />
          ))}
        </RadioGroup>

        <div className="flex flex-col gap-3">
          <p className="text-label-md text-muted-foreground">
            Equipamentos disponíveis
          </p>
          <div className="grid grid-cols-1 gap-3">
            {EQUIPAMENTOS_DISPONIVEIS.map((equipamento) => (
              <CartaoCheckbox
                key={equipamento}
                id={`equipamento-${equipamento}`}
                name="equipamentos"
                value={equipamento}
                titulo={equipamento}
                defaultChecked={respostas.equipamentos?.includes(equipamento)}
              />
            ))}
          </div>
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
