import {
  Esqueleto,
  EsqueletoTela,
} from "@/components/tela";

/**
 * Fronteira prefetchável para todas as etapas da cascata da Triagem.
 * A moldura preserva a mesma altura e o mesmo padding de `CascataShell`;
 * a rolagem continua pertencendo ao `<main>` do casco.
 */
export default function CarregandoTriagem() {
  return (
    <EsqueletoTela
      className="min-h-full flex-1 gap-6 bg-background px-6 py-8"
      rotulo="Carregando triagem"
    >
      <Esqueleto className="h-11 w-11 rounded-full" />
      <div className="flex flex-col gap-2">
        <Esqueleto className="h-2 w-full" />
        <Esqueleto className="h-4 w-24" />
      </div>
      <Esqueleto className="h-8 w-4/5" />
      <div className="flex flex-col gap-3">
        <Esqueleto className="h-16 w-full rounded-xl" />
        <Esqueleto className="h-16 w-full rounded-xl" />
        <Esqueleto className="h-16 w-full rounded-xl" />
      </div>
    </EsqueletoTela>
  );
}
