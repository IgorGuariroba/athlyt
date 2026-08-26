import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";
import { AcaoTela } from "./acao-tela";
import { CabecalhoTela } from "./cabecalho-tela";
import { NotaTela, SecoesTela, TelaConteudo } from "./tela-conteudo";

const meta: Meta<typeof AcaoTela> = {
  title: "Tela/AcaoTela",
  component: AcaoTela,
  parameters: {
    docs: {
      description: {
        component:
          "CTA principal no fluxo normal da tela, para uso dentro do casco autenticado. Diferente de `BarraAcaoFixa` (que é `fixed` e compete com a `BottomNav` no rodapé), este componente deixa o botão seguir o conteúdo — não sobrepõe a navegação inferior nem depende da barra do navegador do aparelho.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  render: () => (
    <TelaConteudo>
      <CabecalhoTela titulo="Prévia do treino" />
      <SecoesTela>
        <p className="text-body-md text-muted-foreground">
          Conteúdo da tela, como a lista de exercícios do dia.
        </p>
      </SecoesTela>
      <NotaTela>Nota auxiliar antes do CTA.</NotaTela>
      <AcaoTela>
        <Button size="cta" className="w-full">
          Iniciar treino
        </Button>
      </AcaoTela>
    </TelaConteudo>
  ),
};
