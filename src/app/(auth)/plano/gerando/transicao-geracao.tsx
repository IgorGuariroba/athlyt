"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, LoaderCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

/** Feedback breve enquanto o plano já materializado é carregado. */
export function TransicaoGeracao() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setTimeout(() => router.replace("/plano/revisao"), 1400);
    return () => window.clearTimeout(timer);
  }, [router]);
  return <main className="flex min-h-dvh flex-col justify-center gap-8 px-6">
    <div className="flex flex-col items-center gap-4 text-center">
      <LoaderCircle className="size-12 animate-spin" aria-hidden="true"/>
      <h1 className="text-headline-md font-bold">Montando seu Plano Ativo</h1>
      <p className="text-muted-foreground">Aplicando regras reproduzíveis ao seu perfil.</p>
    </div>
    <Progress value={100}/>
    <ul className="flex flex-col gap-4">
      {["Perfil analisado", "Bloco de Treino montado", "Metas nutricionais calculadas"].map((passo) => <li key={passo} className="flex items-center gap-3"><CheckCircle2 className="size-5" aria-hidden="true"/><span>{passo}</span></li>)}
    </ul>
  </main>;
}
