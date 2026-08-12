"use client";

import { useEffect, useRef } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Retorno de erro ou sucesso de uma ação, exibido **onde a ação foi
 * disparada**.
 *
 * Existia um padrão de colocar a mensagem no topo do formulário. Em
 * telas longas — a de fotos corporais tem quatro seletores de arquivo,
 * guia, retenção e consentimento — o botão fica fora da mesma dobra: o
 * usuário toca em enviar, nada muda no campo de visão e ele conclui
 * que o botão não funciona, repetindo o toque. A mensagem só aparece
 * se ele rolar de volta ao topo por conta própria.
 *
 * Duas coisas resolvem isso e ambas vivem aqui, para que nenhuma tela
 * precise lembrar delas:
 *
 * - o aviso é renderizado adjacente ao controle que o originou, e não
 *   no topo do formulário;
 * - ao surgir ou mudar de texto, ele se traz para o campo de visão
 *   (`scrollIntoView`) e recebe foco de leitura, cobrindo também o caso
 *   em que a barra de ação fixa o encobre.
 *
 * `role="alert"`/`role="status"` mantêm o anúncio em leitor de tela; o
 * foco programático garante que o leitor pare no aviso mesmo quando o
 * usuário já navegou para outro ponto do formulário.
 */
export function AvisoAcao({
  tipo,
  children,
  className,
}: {
  tipo: "erro" | "sucesso";
  /** Mensagem. Renderize `null` no lugar do componente quando não houver aviso. */
  children: React.ReactNode;
  className?: string;
}) {
  const referencia = useRef<HTMLParagraphElement>(null);
  // O texto entra na dependência para que um novo erro com a mesma
  // montagem — segunda tentativa que falha diferente — role de novo.
  const texto = typeof children === "string" ? children : "";

  useEffect(() => {
    const elemento = referencia.current;
    if (!elemento) return;
    elemento.scrollIntoView({ block: "center", behavior: "smooth" });
    // `preventScroll` porque o scroll suave acima já cuida da posição;
    // sem isso o navegador salta de forma abrupta para o elemento.
    elemento.focus({ preventScroll: true });
  }, [tipo, texto]);

  const Icone = tipo === "erro" ? AlertCircle : CheckCircle2;

  return (
    <p
      ref={referencia}
      role={tipo === "erro" ? "alert" : "status"}
      tabIndex={-1}
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-surface-container px-4 py-3 text-body-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tipo === "erro"
          ? "border-error/40 text-error"
          : "border-success/40 text-success",
        className,
      )}
    >
      <Icone className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}
