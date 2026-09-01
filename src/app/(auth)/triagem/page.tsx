import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { proximaEtapaPendente } from "@/domain/triagem/suficiencia";

const SECOES = [
  {
    titulo: "Você",
    descricao: "Idade, sexo biológico, altura e peso atual.",
  },
  {
    titulo: "Objetivo",
    descricao: "A mudança de composição corporal que orientará o plano.",
  },
  {
    titulo: "Treino",
    descricao: "Experiência, disponibilidade, duração e equipamentos.",
  },
  {
    titulo: "Saúde",
    descricao: "Lesões, desconfortos, condições e medicamentos.",
  },
  {
    titulo: "Alimentação",
    descricao: "Restrições, orçamento e tempo disponível para preparo.",
  },
  {
    titulo: "Rotina",
    descricao: "Atividade diária, recuperação e sono.",
  },
] as const;

/** Introdução da triagem antes da primeira pergunta. */
export default async function InicioTriagemPage({
  searchParams,
}: {
  searchParams: Promise<{ retomar?: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const perfil = await obterPerfilVigente(userId);
  const proxima = proximaEtapaPendente(perfil?.respostas ?? {});

  if ((await searchParams).retomar === "1") {
    redirect(proxima ? `/triagem/${proxima}` : "/triagem/resumo");
  }

  return (
    <main className="flex flex-1 flex-col gap-8 bg-background px-6 py-8">
      <header className="flex flex-col gap-2">
        <p className="text-label text-muted-foreground">SEU PLANO PERSONALIZADO</p>
        <h1 className="text-headline-md font-bold text-on-surface-strong">
          Vamos começar
        </h1>
        <p className="text-body-md text-muted-foreground">
          Conte um pouco sobre você para criarmos um plano seguro, realista e
          adaptado à sua rotina. Você pode pausar e continuar depois.
        </p>
      </header>

      <ol className="flex flex-1 flex-col gap-3">
        {SECOES.map((secao, indice) => (
          <li key={secao.titulo} className="flex gap-4">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-on-surface-strong text-body-md font-semibold text-background">
              {indice + 1}
            </span>
            <span className="flex flex-col pb-2">
              <span className="text-title text-on-surface-strong">{secao.titulo}</span>
              <span className="text-body-sm text-muted-foreground">
                {secao.descricao}
              </span>
            </span>
          </li>
        ))}
      </ol>

      <div className="flex flex-col gap-3">
        <p className="rounded-xl bg-surface-container px-4 py-3 text-body-sm text-muted-foreground">
          Enquanto faltarem dados essenciais, o Modo Conservador mantém as
          recomendações dentro de limites de baixo risco.
        </p>
        <Button asChild size="lg" className="h-12 w-full">
          <Link href="/triagem/idade">Começar</Link>
        </Button>
      </div>
    </main>
  );
}
