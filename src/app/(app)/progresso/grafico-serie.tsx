export function GraficoSerie({ titulo, valores, unidade }: { titulo: string; valores: { data: Date; valor: number }[]; unidade: string }) {
  const serie = [...valores].sort((a, b) => a.data.getTime() - b.data.getTime());
  if (serie.length < 2) return <p className="text-body-sm text-muted-foreground">{titulo}: registre pelo menos dois pontos comparáveis.</p>;
  const min = Math.min(...serie.map((item) => item.valor)); const max = Math.max(...serie.map((item) => item.valor)); const amplitude = max - min || 1;
  const pontos = serie.map((item, indice) => `${(indice / (serie.length - 1)) * 300},${100 - ((item.valor - min) / amplitude) * 90}`).join(" ");
  return <figure><figcaption className="mb-2 flex justify-between text-body-sm"><b>{titulo}</b><span>{serie.at(-1)?.valor.toLocaleString("pt-BR")} {unidade}</span></figcaption><svg role="img" aria-label={`Gráfico de ${titulo} com ${serie.length} registros`} viewBox="0 0 300 110" className="h-28 w-full overflow-visible"><polyline fill="none" stroke="currentColor" strokeWidth="3" points={pontos}/>{serie.map((item, indice) => <circle key={`${item.data.toISOString()}-${indice}`} cx={(indice / (serie.length - 1)) * 300} cy={100 - ((item.valor - min) / amplitude) * 90} r="4" fill="currentColor"><title>{item.data.toLocaleDateString("pt-BR")}: {item.valor.toLocaleString("pt-BR")} {unidade}</title></circle>)}</svg></figure>;
}
