import {
  Esqueleto,
  EsqueletoCabecalho,
  EsqueletoTela,
} from "@/components/tela";

/**
 * A rota mais lenta do produto: além do panorama corporal, assina uma
 * URL de leitura no R2 por foto (até 12) antes de renderizar. O
 * esqueleto reserva a grade para que as miniaturas não empurrem o
 * conteúdo ao chegarem.
 */
export default function CarregandoAvaliacaoVisual() {
  return (
    <EsqueletoTela className="min-h-full" rotulo="Carregando a avaliação visual">
      <EsqueletoCabecalho />
      <div className="grid grid-cols-3 gap-3 px-6">
        {Array.from({ length: 6 }, (_, indice) => (
          <Esqueleto key={indice} className="aspect-square w-full rounded-xl" />
        ))}
      </div>
    </EsqueletoTela>
  );
}
