import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GitBranch, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

import {
  ItemAcaoNavegacao,
  ItemNavegacao,
  ListaNavegacao,
} from "./lista-navegacao";

const meta: Meta<typeof ListaNavegacao> = {
  title: "Tela/ListaNavegacao",
  component: ListaNavegacao,
  parameters: {
    docs: {
      description: {
        component:
          "Destinos agrupados em um cartão com divisores; a linha inteira é o alvo. `ItemAcaoNavegacao` submete um form (server action) em vez de navegar — é o que separa 'Sair' de um destino.",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  render: () => (
    <ListaNavegacao>
      <ItemNavegacao
        href="#"
        Icone={GitBranch}
        rotulo="Trilhas de Decisão"
        descricao="Dados e regras por trás de cada recomendação"
      />
      <ItemNavegacao href="#" Icone={ShieldCheck} rotulo="Consentimentos" />
      <ItemNavegacao
        href="#"
        Icone={RefreshCw}
        rotulo="Sincronização"
        valor="3"
      />
      <ItemAcaoNavegacao acao="#" Icone={LogOut} rotulo="Sair" />
    </ListaNavegacao>
  ),
};

export const AcaoDestrutiva: Story = {
  render: () => (
    <ListaNavegacao>
      <ItemNavegacao href="#" rotulo="Exportar meus dados" />
      <ItemAcaoNavegacao
        acao="#"
        Icone={LogOut}
        rotulo="Excluir conta"
        descricao="Remove o histórico de treino e nutrição"
        destrutivo
      />
    </ListaNavegacao>
  ),
};
