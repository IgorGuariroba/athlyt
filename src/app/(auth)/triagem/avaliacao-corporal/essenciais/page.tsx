import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { salvarMedidasEssenciais } from "../actions";

export default async function EssenciaisPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-5 p-5"><div><p className="text-label-md uppercase text-muted-foreground">Medidas essenciais</p><h1 className="text-headline-md font-bold">Faça duas leituras por região</h1><p className="text-body-sm text-muted-foreground">Fita nivelada, sem comprimir a pele. Use a terceira leitura somente se solicitado.</p></div>{erro ? <p role="alert" className="text-body-sm text-error">{erro}</p> : null}<form action={salvarMedidasEssenciais} className="flex flex-1 flex-col gap-5">{["cintura", "pescoco", "quadril"].map((regiao) => <fieldset key={regiao} className="grid grid-cols-3 gap-2"><legend className="mb-2 capitalize font-semibold">{regiao === "pescoco" ? "Pescoço" : regiao}</legend>{[1,2,3].map((n) => <Input key={n} name={`${regiao}${n}`} type="number" step="0.1" min="10" max="250" required={n < 3} placeholder={`${n}ª (cm)`} aria-label={`${regiao}, leitura ${n}`} />)}</fieldset>)}<Button className="mt-auto" size="lg" type="submit">Salvar e continuar</Button></form></main>;
}
