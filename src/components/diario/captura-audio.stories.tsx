import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { CapturaAudio } from "./captura-audio";

function Interativo(args: Partial<React.ComponentProps<typeof CapturaAudio>>) {
  const [audio, setAudio] = useState<File | null>(args.audio ?? null);
  return <CapturaAudio {...args} audio={audio} aoGravar={setAudio} />;
}

const meta = {
  title: "Diário/CapturaAudio",
  component: CapturaAudio,
  parameters: {
    docs: {
      description: {
        component:
          "Gravação de um áudio curto descrevendo a refeição. Grava com MediaRecorder em vez de abrir o gravador do sistema: o gesto que o componente encurta é justamente a ida e volta entre aplicativos.",
      },
    },
  },
  args: {
    audio: null,
    aoGravar: () => {},
    dica: "Diga o que comeu e as porções como você lembra: “dois ovos, um pão francês e um copo de leite”.",
  },
} satisfies Meta<typeof CapturaAudio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ocioso: Story = {
  render: (args) => <Interativo dica={args.dica} />,
};

export const ComAudioGravado: Story = {
  render: () => (
    <Interativo
      audio={new File([new Uint8Array([1, 2, 3])], "descricao-refeicao", { type: "audio/webm" })}
    />
  ),
};
