import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { obterSessaoAtual } from "@/auth/sessao";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AcaoTela, AvisoAcao, CabecalhoTela, NotaTela, SecoesTela, TelaConteudo } from "@/components/tela";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { alterarModoConservador } from "./actions";

export default async function ModoConservadorPage({ searchParams }: { searchParams: Promise<{ sucesso?: string }> }) {
  const session = await obterSessaoAtual();
  if (!session?.user?.id) redirect("/");
  const [perfil, params] = await Promise.all([obterPerfilVigente(session.user.id), searchParams]);
  const ativo = perfil?.respostas.modoConservadorManual ?? false;

  return (
    <TelaConteudo>
      <CabecalhoTela contexto="Configurações" titulo="Modo conservador" descricao="Escolha se o plano deve priorizar uma progressão mais cautelosa." voltar={{ href: "/mais", rotulo: "Voltar para Mais" }} />
      <form action={alterarModoConservador}>
        <SecoesTela>
          {params.sucesso ? <AvisoAcao tipo="sucesso">Preferência salva.</AvisoAcao> : null}
          <NotaTela>Quando ativo, o Athlyt evita exercícios de técnica avançada e mantém metas e progressões mais prudentes. Quando desativado, o plano usa os dados completos do seu perfil para ajustar a estratégia.</NotaTela>
          <label className="flex min-h-24 items-center gap-4 rounded-xl border border-border bg-surface-container px-4 py-4">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-container-high">
              <ShieldCheck aria-hidden="true" className="size-6 text-on-surface-strong" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-2 text-body-lg text-on-surface-strong">
                Usar modo conservador
                <Badge variant={ativo ? "secondary" : "outline"}>{ativo ? "Ativo" : "Desativado"}</Badge>
              </span>
              <span className="mt-1 block text-body-sm text-muted-foreground">
                {ativo ? "O próximo plano terá progressões e escolhas mais prudentes." : "O próximo plano não aplicará as restrições conservadoras."}
              </span>
            </span>
            <Switch name="modoConservador" defaultChecked={ativo} aria-label={`${ativo ? "Desativar" : "Ativar"} modo conservador`} />
          </label>
        </SecoesTela>
        <AcaoTela><Button type="submit" size="cta" className="w-full">Salvar preferência</Button></AcaoTela>
      </form>
      <NotaTela>A alteração vale para os próximos planos gerados. O plano ativo atual não é alterado automaticamente.</NotaTela>
    </TelaConteudo>
  );
}
