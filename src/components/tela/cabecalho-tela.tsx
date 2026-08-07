/**
 * Cabeçalho padrão de uma tela de conteúdo: contexto (eyebrow),
 * título e explicação curta, na ordem da hierarquia espacial de
 * DESIGN.md > Layout ("título/contexto" antes de tudo).
 *
 * O eyebrow é o único lugar do produto onde caixa alta é aceita: ele
 * é rótulo de seção, não título (DESIGN.md > Typography > Regras —
 * "títulos do app usam sentence case").
 */
export function CabecalhoTela({
  contexto,
  titulo,
  descricao,
  acao,
}: {
  contexto?: string;
  titulo: string;
  descricao?: string;
  /** Ação secundária alinhada ao contexto — badge, link ou botão. */
  acao?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 px-6 pt-8 pb-6">
      {contexto || acao ? (
        <div className="flex items-center justify-between gap-3">
          {contexto ? (
            <p className="text-label-md font-semibold tracking-wide text-muted-foreground uppercase">
              {contexto}
            </p>
          ) : (
            <span />
          )}
          {acao}
        </div>
      ) : null}
      <h1 className="text-[2rem] leading-tight font-bold text-on-surface-strong">
        {titulo}
      </h1>
      {descricao ? (
        <p className="text-body-md leading-relaxed text-muted-foreground">
          {descricao}
        </p>
      ) : null}
    </header>
  );
}
