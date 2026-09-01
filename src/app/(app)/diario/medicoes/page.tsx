import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AvisoAcao,
  CabecalhoTela,
  CampoSelecao,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { registrarCheckinCorporal } from "./actions";

/**
 * Registro avulso de medições. Cada campo é opcional por construção:
 * por neutralidade comportamental, o produto não força o atleta a
 * completar o que não foi medido.
 */
const METODOS = [
  { valor: "bioimpedancia", rotulo: "Bioimpedância" },
  { valor: "adipometro", rotulo: "Adipômetro" },
  { valor: "dexa", rotulo: "DEXA/DXA" },
  { valor: "hidrostatica", rotulo: "Pesagem hidrostática" },
  { valor: "fita", rotulo: "Estimativa por fita" },
  { valor: "outro", rotulo: "Outro" },
] as const;

export default async function MedicoesPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <TelaConteudo>
      <CabecalhoTela
        titulo="Medições"
        descricao="Registro avulso. Preencha somente o que mediu hoje."
        voltar={{ href: "/diario", rotulo: "Voltar ao Diário" }}
      />

      <SecoesTela>
        <form action={registrarCheckinCorporal} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="peso">Peso (kg)</Label>
            <Input
              id="peso"
              name="peso"
              type="number"
              inputMode="decimal"
              min="30"
              max="300"
              step="0.1"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="cintura">Cintura (cm)</Label>
            <Input
              id="cintura"
              name="cintura"
              type="number"
              inputMode="decimal"
              min="10"
              max="250"
              step="0.1"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="gordura">Gordura corporal (%)</Label>
            <Input
              id="gordura"
              name="gordura"
              type="number"
              inputMode="decimal"
              min="2"
              max="70"
              step="0.1"
            />
            <p className="text-body-sm text-muted-foreground">
              Opcional. O método importa: trocar de aparelho muda o número sem
              que o corpo tenha mudado.
            </p>
          </div>

          <CampoSelecao
            id="metodo"
            name="metodo"
            rotulo="Método da medição de gordura"
            opcoes={METODOS}
          />

          <div className="flex flex-col gap-2">
            <Label htmlFor="protocolo">Protocolo ou condições</Label>
            <Input
              id="protocolo"
              name="protocolo"
              placeholder="Em jejum, mesma balança…"
            />
          </div>

          {erro ? <AvisoAcao tipo="erro">{erro}</AvisoAcao> : null}

          <Button size="cta">Registrar medições</Button>
        </form>
      </SecoesTela>
    </TelaConteudo>
  );
}
