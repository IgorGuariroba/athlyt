export const COMPONENTES_TELA_LEGADOS = new Set([
  "AvisoAcao", "BarraAcaoFixa", "BarraFaixa", "CORES_MACRO", "Macro", "MACROS",
  "MacroEnergetico", "BarraMacro", "CabecalhoSecao", "CabecalhoTela", "CampoSelecao",
  "CartaoLista", "CabecalhoCartaoLista", "LinhasCartaoLista", "LinhaCartaoLista",
  "FaixaDados", "ChipSelecao", "ControleSegmentado", "EstadoVazio", "GradeSelecaoFoto",
  "ItemSelecaoFoto", "PontoSerie", "Serie", "GraficoTendencia", "ListaNavegacao",
  "ItemNavegacao", "MedidorScore", "PainelMetricas", "Metrica", "Revelar", "TelaConteudo",
  "SecoesTela", "NotaTela", "ItemPendencia",
]);

export function validarComponenteDeTela({
  nome,
  fonteGaleria,
  fontesTestes,
}: {
  nome: string;
  fonteGaleria: string;
  fontesTestes: readonly string[];
}): string[] {
  const problemas: string[] = [];
  const uso = new RegExp(`<${nome}(?:\\s|/|>)`);
  const mencao = new RegExp(`\\b${nome}\\b`);

  if (!uso.test(fonteGaleria)) {
    problemas.push(`${nome} não possui demonstração em /design`);
  }
  if (!fontesTestes.some((fonte) => mencao.test(fonte))) {
    problemas.push(`${nome} não possui teste de contrato`);
  }

  return problemas;
}

export function validarNovosComponentesDeTela({
  nomes,
  fonteGaleria,
  fontesTestes,
}: {
  nomes: readonly string[];
  fonteGaleria: string;
  fontesTestes: readonly string[];
}): string[] {
  return nomes
    .filter((nome) => !COMPONENTES_TELA_LEGADOS.has(nome) && /^[A-Z]/.test(nome))
    .flatMap((nome) =>
      validarComponenteDeTela({ nome, fonteGaleria, fontesTestes }),
    );
}
