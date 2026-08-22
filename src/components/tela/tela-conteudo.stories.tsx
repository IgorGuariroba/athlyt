import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Button } from "@/components/ui/button";
import { BarraAcaoFixa } from "./barra-acao-fixa";
import { CabecalhoSecao } from "./cabecalho-secao";
import { CabecalhoTela } from "./cabecalho-tela";
import { CartaoLista, LinhaCartaoLista, LinhasCartaoLista } from "./cartao-lista";
import { NotaTela, SecoesTela, TelaConteudo } from "./tela-conteudo";

const meta: Meta<typeof TelaConteudo> = {
  title: "Tela/TelaConteudo",
  component: TelaConteudo,
  parameters: {
    docs: {
      description: {
        component:
          "O casco de toda tela: largura, respiro lateral e ritmo vertical. `SecoesTela` aplica o gap entre blocos e `NotaTela` fecha com texto auxiliar. Com `comAcaoFixa`, reserva o espaço da `BarraAcaoFixa` para que o último item não fique sob ela.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const TelaCompleta: Story = {
  render: () => (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Progresso"
        titulo="Composição corporal"
        descricao="Tendência dos últimos 90 dias."
      />
      <SecoesTela>
        <section className="flex flex-col gap-3">
          <CabecalhoSecao titulo="Medições" descricao="Últimos registros." />
          <CartaoLista>
            <LinhasCartaoLista>
              <LinhaCartaoLista titulo="Peso" valor="78,5 kg" />
              <LinhaCartaoLista titulo="Cintura" valor="82,1 cm" />
            </LinhasCartaoLista>
          </CartaoLista>
        </section>
      </SecoesTela>
      <NotaTela>
        Medições registradas sempre no mesmo horário são mais comparáveis.
      </NotaTela>
    </TelaConteudo>
  ),
};

export const ComAcaoFixa: Story = {
  render: () => (
    // `transform` prende a barra `fixed` a esta moldura, para que a
    // story mostre o espaço reservado por `comAcaoFixa` em vez de
    // ancorar no viewport do canvas.
    <div className="relative h-96 translate-x-0 overflow-y-auto rounded-lg border border-border">
      <TelaConteudo comAcaoFixa>
        <CabecalhoTela titulo="Revise suas respostas" />
        <SecoesTela>
          {Array.from({ length: 6 }, (_, i) => (
            <p key={i} className="text-body-md text-muted-foreground">
              Resposta {i + 1} da triagem.
            </p>
          ))}
        </SecoesTela>
      </TelaConteudo>
      <BarraAcaoFixa>
        <Button size="cta" className="w-full">
          Gerar meu plano
        </Button>
      </BarraAcaoFixa>
    </div>
  ),
};
