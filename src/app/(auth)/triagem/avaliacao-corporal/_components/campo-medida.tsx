"use client";

import { useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { salvarMedidaDaRegiao } from "../actions";

/**
 * Campo de circunferência que grava sozinho ao perder o foco.
 *
 * Sem isso, digitar uma medida e sair da tela pelo Voltar perde o
 * valor: ele só existiria no input até um submit que a navegação
 * cancela — a causa "escrita" de `docs/memory/persistencia-visivel-apos-retorno.md`.
 *
 * O autosave é silencioso por desenho: erro aqui não interrompe a
 * digitação, porque a validação visível pertence ao submit. O que o
 * usuário precisa saber é apenas que o valor ficou guardado, e isso o
 * indicador "Salvo" comunica.
 */
export function CampoMedida({
  id,
  prefixo,
  valorInicial,
  invalido,
  obrigatorio,
  rotuloAcessivel,
  className,
}: {
  id?: string;
  prefixo: string;
  valorInicial: string;
  invalido?: boolean;
  obrigatorio?: boolean;
  rotuloAcessivel?: string;
  className?: string;
}) {
  const [estado, setEstado] = useState<"parado" | "salvando" | "salvo">("parado");
  // Guarda o que já foi persistido para não regravar a cada blur em um
  // campo que o usuário apenas tocou sem alterar.
  const ultimoSalvo = useRef(valorInicial.trim());

  async function aoSairDoCampo(valorBruto: string) {
    const valor = valorBruto.trim();
    if (valor === ultimoSalvo.current) return;
    if (!valor) return;

    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero)) return;

    setEstado("salvando");
    const resultado = await salvarMedidaDaRegiao(prefixo, numero);
    if (resultado.ok) {
      ultimoSalvo.current = valor;
      setEstado("salvo");
    } else {
      // Valor recusado: o submit explicará o motivo, com destaque no campo.
      setEstado("parado");
    }
  }

  return (
    <span className="relative inline-flex items-center">
      <Input
        id={id}
        name={prefixo}
        type="number"
        inputMode="decimal"
        step="0.1"
        min="10"
        max="250"
        required={obrigatorio}
        placeholder="—"
        defaultValue={valorInicial}
        aria-label={rotuloAcessivel}
        aria-invalid={invalido ? true : undefined}
        onBlur={(evento) => {
          // O submit já persiste o formulário inteiro. Não dispare uma
          // segunda escrita concorrente quando o blur foi causado pelo
          // botão de avançar; Voltar e qualquer outro destino continuam
          // fazendo autosave normalmente.
          const destino = evento.relatedTarget;
          const vaiSubmeterEsteFormulario =
            destino instanceof HTMLButtonElement &&
            destino.type === "submit" &&
            evento.currentTarget.form?.contains(destino);
          if (!vaiSubmeterEsteFormulario) {
            void aoSairDoCampo(evento.currentTarget.value);
          }
        }}
        onChange={() => {
          if (estado === "salvo") setEstado("parado");
        }}
        className={className}
      />
      <span
        aria-live="polite"
        className="pointer-events-none absolute -top-1 -right-1"
      >
        {estado === "salvando" ? (
          <Loader2
            className="size-3.5 animate-spin text-muted-foreground"
            aria-label="Salvando medida"
          />
        ) : estado === "salvo" ? (
          <Check className="size-3.5 text-success" aria-label="Medida salva" />
        ) : null}
      </span>
    </span>
  );
}
