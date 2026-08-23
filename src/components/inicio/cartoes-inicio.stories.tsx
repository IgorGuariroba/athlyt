import type { Meta, StoryObj } from "@storybook/react";
import { ArrowRight, Dumbbell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExplicacaoAgent } from "@/components/tela/explicacao-agent";
import { CartaoPlanoAtivo, CartaoPlanoAtivoCabecalho, CartaoPlanoAtivoSecao, CartaoSessaoDoDia, CartaoSessaoDoDiaAcao, CartaoSessaoDoDiaCorpo, ResumoMacros } from "./cartoes-inicio";

const meta = { title: "Início/Cartões", component: CartaoSessaoDoDia, args: { children: null } } satisfies Meta<typeof CartaoSessaoDoDia>;
export default meta;
type Story = StoryObj<typeof meta>;

export const SessaoEmAndamento: Story = { render: () => <CartaoSessaoDoDia><CartaoSessaoDoDiaCorpo><p className="text-label-md font-semibold uppercase text-muted-foreground">Sessão em andamento</p><h2 className="text-headline-md font-bold text-on-surface-strong">Puxar A</h2><p className="text-body-md text-muted-foreground">4 exercícios · 12 séries</p></CartaoSessaoDoDiaCorpo><CartaoSessaoDoDiaAcao><Button variant="ghost">Retomar treino <ArrowRight className="size-5" /></Button></CartaoSessaoDoDiaAcao></CartaoSessaoDoDia> };
export const Cabecalho: Story = { args: { children: "Cabeçalho Início" } };
export const BoasVindas: Story = { args: { children: "Olá, atleta" } };
export const Personalizacao: Story = { args: { children: "Aprimore sua personalização" } };
export const CabecalhoPlano: Story = { args: { children: "Plano Ativo" } };
export const MetricasPlano: Story = { args: { children: "6 semanas · 6 treinos" } };
export const MetaNutricional: Story = { args: { children: "2750 kcal" } };

export const PlanoAtivo: Story = { render: () => <CartaoPlanoAtivo><CartaoPlanoAtivoCabecalho><div className="flex gap-3"><div className="flex size-11 items-center justify-center rounded-full bg-on-surface-strong text-background"><Dumbbell className="size-5" /></div><div><p className="text-label-md font-semibold uppercase text-muted-foreground">Plano ativo</p><h2 id="plano-ativo-titulo" className="text-title-lg font-bold text-on-surface-strong">Push/Pull/Legs</h2></div></div><span className="text-body-sm text-muted-foreground">v3</span></CartaoPlanoAtivoCabecalho><CartaoPlanoAtivoSecao><ExplicacaoAgent pergunta="Por que esta divisão?" explicacao={{ porque: "Distribui o volume semanal entre os grupos musculares.", dadosUsados: [] }} /></CartaoPlanoAtivoSecao><ResumoMacros><p className="text-headline-md font-bold text-on-surface-strong">2750 kcal</p><div className="h-3 rounded-full bg-nutrition-protein" aria-label="Distribuição de macronutrientes" /></ResumoMacros></CartaoPlanoAtivo> };
