import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./avatar";

const meta = {
  title: "Primitivos/Avatar",
  component: Avatar,
} satisfies Meta<typeof Avatar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Padrao: Story = {
  render: () => (
    <Avatar>
      <AvatarFallback>AT</AvatarFallback>
    </Avatar>
  ),
};

export const Tamanhos: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <Avatar size="sm">
        <AvatarFallback>AT</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MV</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>JS</AvatarFallback>
      </Avatar>
    </div>
  ),
};

export const ComImagem: Story = {
  render: () => (
    <Avatar size="lg">
      <AvatarImage src="/equipamentos/personalizado.svg" alt="" />
      <AvatarFallback>AT</AvatarFallback>
    </Avatar>
  ),
};

export const ComMarcador: Story = {
  render: () => (
    <Avatar size="lg">
      <AvatarFallback>AT</AvatarFallback>
      <AvatarBadge />
    </Avatar>
  ),
};

export const Grupo: Story = {
  render: () => (
    <AvatarGroup>
      <Avatar>
        <AvatarFallback>AT</AvatarFallback>
      </Avatar>
      <Avatar>
        <AvatarFallback>MV</AvatarFallback>
      </Avatar>
      <AvatarGroupCount>+3</AvatarGroupCount>
    </AvatarGroup>
  ),
};
