import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function AvaliacaoCorporalPage() {
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 p-5">
    <div className="mt-8 space-y-3"><p className="text-label-md uppercase text-muted-foreground">Avaliação Corporal Inicial</p><h1 className="text-headline-lg font-bold">Personalize com sua linha de base</h1><p className="text-body-md text-muted-foreground">Medidas reproduzíveis melhoram as prioridades do treino e a leitura da estratégia alimentar. Você pode continuar sem concluir tudo.</p></div>
    <div className="grid gap-3"><Card className="p-4"><strong>Medidas essenciais</strong><p className="text-body-sm text-muted-foreground">Cintura, pescoço e quadril melhoram a leitura da composição corporal.</p></Card><Card className="p-4"><strong>Proporções e simetria</strong><p className="text-body-sm text-muted-foreground">O conjunto completo ajuda a orientar ênfases, sem nota corporal.</p></Card></div>
    <div className="mt-auto grid gap-3"><Button asChild size="lg"><Link href="/triagem/avaliacao-corporal/essenciais">Começar medidas essenciais</Link></Button><Button asChild variant="ghost"><Link href="/triagem/objetivo">Fazer depois</Link></Button></div>
  </main>;
}
