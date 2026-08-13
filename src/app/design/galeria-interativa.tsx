"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RoletaValor } from "@/components/ui/roleta-valor";
import { ControleFaixa } from "@/components/ui/controle-faixa";
import { AvisoAcao } from "@/components/tela/aviso-acao";

/**
 * Parte da galeria que depende de estado de cliente: controles de
 * seleção, menu suspenso e a roleta de valor. Fica isolada aqui para
 * que a página de referência permaneça um Server Component.
 */
export function ControlesSelecao() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Checkbox id="galeria-check-a" defaultChecked />
        <Label htmlFor="galeria-check-a">Checkbox marcado</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="galeria-check-b" />
        <Label htmlFor="galeria-check-b">Checkbox padrão</Label>
      </div>
      <div className="flex items-center gap-3">
        <Checkbox id="galeria-check-c" disabled />
        <Label htmlFor="galeria-check-c">Checkbox desabilitado</Label>
      </div>
      <RadioGroup defaultValue="media" className="flex flex-col gap-3">
        {[
          { valor: "baixa", rotulo: "Intensidade baixa" },
          { valor: "media", rotulo: "Intensidade média" },
          { valor: "alta", rotulo: "Intensidade alta" },
        ].map((opcao) => (
          <div key={opcao.valor} className="flex items-center gap-3">
            <RadioGroupItem value={opcao.valor} id={`galeria-radio-${opcao.valor}`} />
            <Label htmlFor={`galeria-radio-${opcao.valor}`}>{opcao.rotulo}</Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}

export function MenuSuspenso() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <MoreHorizontal aria-hidden="true" />
          Ações do registro
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>Registro de peso</DropdownMenuLabel>
        <DropdownMenuItem>Editar valor</DropdownMenuItem>
        <DropdownMenuItem>Duplicar para hoje</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RoletaDemonstracao() {
  const [peso, setPeso] = useState(78.5);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-display font-bold tabular-nums text-on-surface-strong">
        {peso.toLocaleString("pt-BR", { minimumFractionDigits: 1 })}{" "}
        <span className="text-title text-muted-foreground">kg</span>
      </p>
      <RoletaValor
        eixo="x"
        minimo={40}
        maximo={160}
        passo={0.1}
        valorInicial={78.5}
        aoMudar={setPeso}
        passoPx={14}
        rotulo="Peso corporal"
        // A roleta é posicionada em absoluto internamente: sem altura
        // declarada pelo contexto, o trilho colapsa para zero.
        className="h-32 w-full rounded-xl bg-surface-container"
        formatarRotulo={(valor) =>
          Math.abs(valor - Math.round(valor)) < 0.05 ? `${Math.round(valor)}` : null
        }
        descreverValor={(valor) =>
          `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1 })} quilos`
        }
      />
    </div>
  );
}

export function FaixaDemonstracao() {
  const [zoom, setZoom] = useState(140);

  return (
    <ControleFaixa
      id="galeria-zoom"
      rotulo="Zoom da comparação"
      valor={zoom}
      aoMudar={setZoom}
      minimo={100}
      maximo={200}
      formatarValor={(valor) => `${valor}%`}
    />
  );
}

export function AvisosDemonstracao() {
  const [visivel, setVisivel] = useState<"erro" | "sucesso" | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => setVisivel("sucesso")}>
          Mostrar sucesso
        </Button>
        <Button variant="outline" size="sm" onClick={() => setVisivel("erro")}>
          Mostrar erro
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setVisivel(null)}>
          Limpar
        </Button>
      </div>
      {visivel === "sucesso" ? (
        <AvisoAcao tipo="sucesso">Registro salvo no diário de hoje.</AvisoAcao>
      ) : null}
      {visivel === "erro" ? (
        <AvisoAcao tipo="erro">
          Não foi possível salvar. Verifique a conexão e tente novamente.
        </AvisoAcao>
      ) : null}
    </div>
  );
}
