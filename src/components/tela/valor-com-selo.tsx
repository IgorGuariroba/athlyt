import { Badge } from "@/components/ui/badge";

/**
 * Métrica de uma linha acompanhada do selo que a qualifica —
 * "Recorde 60 kg", "Meta 84,5 cm".
 *
 * O par selo+valor é uma unidade de leitura: o número sozinho não diz
 * por que está ali, e o selo sozinho não diz quanto. Mantê-los juntos
 * em um componente evita que cada tela escolha seu próprio
 * espaçamento e sua própria cor de selo, que foi como o "Recorde" da
 * tela de resumo acabou com a cor aplicada por classe avulsa.
 *
 * Vai no slot `valor` de `LinhaCartaoLista`, que já cuida do
 * alinhamento à direita e dos números tabulares.
 */
export function ValorComSelo({
  selo,
  tom = "warning",
  children,
}: {
  selo: string;
  /** Reforço de significado: conquista, alerta ou neutro. */
  tom?: "success" | "warning" | "outline";
  children: React.ReactNode;
}) {
  return (
    <span className="flex items-center gap-2">
      <Badge variant={tom}>{selo}</Badge>
      {children}
    </span>
  );
}
