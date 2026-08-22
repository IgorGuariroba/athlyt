import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";
import { BarraAcaoFixa } from "./barra-acao-fixa";

const meta: Meta<typeof BarraAcaoFixa> = {
  title: "Tela/BarraAcaoFixa",
  component: BarraAcaoFixa,
  parameters: {
    docs: {
      description: {
        component:
          "CTA principal ancorado ao rodapé, com safe area inferior. É `fixed`, não `sticky`: a tela inteira rola, e sticky dentro de um `main` em coluna só colaria no fim do conteúdo. Na tela real, o espaço que ocupa é reservado por `TelaConteudo comAcaoFixa`.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  render: () => (
    // `transform` estabelece um bloco de contensção para descendentes
    // `fixed`, o que prende a barra a esta moldura em vez do viewport
    // do canvas. É o único jeito de mostrar, numa story, a relação
    // entre a barra e o conteúdo que passa por baixo dela.
    <div className="relative h-96 translate-x-0 overflow-hidden rounded-lg border border-border">
      <div
        className="h-full overflow-y-auto p-4 pb-24"
        tabIndex={0}
        aria-label="Conteúdo rolável da etapa"
      >
        <div className="flex flex-col gap-3">
          {Array.from({ length: 12 }, (_, i) => (
            <p key={i} className="text-body-md text-muted-foreground">
              Conteúdo rolável da etapa, linha {i + 1}.
            </p>
          ))}
        </div>
      </div>
      <BarraAcaoFixa>
        <Button size="cta" className="w-full">
          Continuar
        </Button>
      </BarraAcaoFixa>
    </div>
  ),
};
