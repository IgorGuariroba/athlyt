import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";
import { Button } from "./button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Progress } from "./progress";

/**
 * Páginas não importam `Card` diretamente — a regra `composicao-crua`
 * bloqueia isso, para que padrões de cartão vivam em
 * `@/components/tela`. Esta story existe para a camada de composição,
 * que é quem legitimamente monta cartões.
 */
const meta = {
  title: "Primitivos/Card",
  component: Card,
  parameters: {
    docs: {
      description: {
        component:
          "Cartão agrupa; divisores separam. Não transforme cada linha em cartão.",
      },
    },
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completo: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Aderência da semana</CardTitle>
        <CardDescription>
          Sete dias comparados à prescrição vigente.
        </CardDescription>
        <CardAction>
          <Badge variant="secondary">86%</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={86} />
        <p className="text-body-sm text-muted-foreground">
          Seis registros completos de sete dias.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Ver detalhamento
        </Button>
      </CardFooter>
    </Card>
  ),
};
