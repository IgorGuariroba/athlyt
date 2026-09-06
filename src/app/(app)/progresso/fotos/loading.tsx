import {
  Esqueleto,
  EsqueletoCabecalho,
  EsqueletoTela,
} from "@/components/tela";

/** Galeria de fotos: uma URL assinada no R2 por miniatura. */
export default function CarregandoFotos() {
  return (
    <EsqueletoTela className="min-h-full" rotulo="Carregando as fotos de progresso">
      <EsqueletoCabecalho />
      <div className="grid grid-cols-3 gap-3 px-6">
        {Array.from({ length: 9 }, (_, indice) => (
          <Esqueleto key={indice} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </EsqueletoTela>
  );
}
