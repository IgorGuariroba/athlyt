import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MoreHorizontal } from "lucide-react";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const meta = {
  title: "Primitivos/DropdownMenu",
  component: DropdownMenu,
  parameters: {
    // O conteúdo abre em portal, fora do casco de 390px do preview.
    // Sem altura reservada, a story mede alguns pixels e o menu
    // aberto fica cortado no canvas.
    layout: "padded",
  },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AcoesDoRegistro: Story = {
  render: () => (
    <div className="min-h-72">
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
          <DropdownMenuItem>
            Duplicar para hoje
            <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Excluir</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
};

export const ComGrupoSubmenuESelecao: Story = {
  render: () => (
    <div className="min-h-96">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Exibição
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuPortal>
          <DropdownMenuContent align="start">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Colunas</DropdownMenuLabel>
              <DropdownMenuCheckboxItem checked>Volume</DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem>RIR</DropdownMenuCheckboxItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup value="90">
              <DropdownMenuLabel>Período</DropdownMenuLabel>
              <DropdownMenuRadioItem value="30">30 dias</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="90">90 dias</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Exportar</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>CSV</DropdownMenuItem>
                <DropdownMenuItem>JSON</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenuPortal>
      </DropdownMenu>
    </div>
  ),
};
