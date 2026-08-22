/**
 * Governança da galeria do design system.
 *
 * Todo componente de `src/components/**` precisa aparecer no Storybook
 * e ter teste de contrato. A galeria é o que impede o catálogo de virar
 * um depósito: um componente que ninguém consegue ver é um componente
 * que a próxima tela vai reinventar.
 *
 * A unidade de cobrança é o **arquivo**, não o export. `cartao-lista.tsx`
 * exporta quatro peças que só fazem sentido montadas (`CartaoLista`,
 * `CabecalhoCartaoLista`, `LinhasCartaoLista`, `LinhaCartaoLista`); exigir
 * uma story de cada uma produziria quatro demonstrações incompletas no
 * lugar de uma correta. O arquivo tem uma story, e essa story precisa
 * exercitar todos os componentes que o arquivo exporta.
 */

/**
 * Camadas cujo comportamento é do projeto, e por isso exigem teste de
 * contrato além da story.
 *
 * `ui` fica de fora: são primitivos shadcn/Radix, cujo comportamento já
 * é testado upstream. Testar aqui que um `Checkbox` marca ao clicar
 * seria testar a Radix. O que é nosso nesses arquivos são os tokens
 * aplicados, e disso a story dá conta. Componentes próprios que moram
 * em `ui` por serem primitivos — `RoletaValor`, `ControleFaixa` — têm a
 * lógica testada em arquivo separado (`roleta-valor.logica.ts`).
 */
const CAMADAS_COM_TESTE_DE_CONTRATO = new Set(["tela", "fotos", "navigation"]);

/**
 * Componentes que ainda não têm teste de contrato dedicado.
 *
 * Diferente da galeria — onde a cobertura é total e verificada — o teste
 * de contrato foi introduzido depois destes componentes. A lista não
 * cresce: um componente novo nasce com teste, e este conjunto só encolhe.
 */
export const COMPONENTES_SEM_TESTE_DE_CONTRATO = new Set([
  // Pré-existentes em `fotos`/`navigation`, camadas que a governança
  // só passou a cobrar ao migrar para o Storybook.
  "EnvioFotos", "BottomNav",
  "AvisoAcao", "BarraAcaoFixa", "BarraFaixa", "CORES_MACRO", "Macro", "MACROS",
  "MacroEnergetico", "BarraMacro", "CabecalhoSecao", "CabecalhoTela", "CampoSelecao",
  "CartaoLista", "CabecalhoCartaoLista", "LinhasCartaoLista", "LinhaCartaoLista",
  "FaixaDados", "ChipSelecao", "ControleSegmentado", "EstadoVazio", "GradeSelecaoFoto",
  "ItemSelecaoFoto", "PontoSerie", "Serie", "GraficoTendencia", "ListaNavegacao",
  "ItemNavegacao", "MedidorScore", "PainelMetricas", "Metrica", "Revelar", "TelaConteudo",
  "SecoesTela", "NotaTela", "ItemPendencia",
]);

/** Nome que denota um componente React: PascalCase, sem caixa alta de constante. */
export function ehNomeDeComponente(nome: string): boolean {
  return /^[A-Z][a-zA-Z0-9]*$/.test(nome) && nome !== nome.toUpperCase();
}

/**
 * Componentes cobráveis de um arquivo do catálogo: exclui tipos
 * (`type Serie` não tem como ser renderizado), constantes (`MACROS`) e
 * helpers em camelCase (`calcularDeltaTendencia`).
 */
export function componentesDoArquivo({
  exports,
  tipos,
}: {
  exports: readonly string[];
  tipos: readonly string[];
}): string[] {
  return exports.filter(
    (nome) => ehNomeDeComponente(nome) && !tipos.includes(nome),
  );
}

/** Caminho da story esperada para um arquivo de componente. */
export function caminhoDaStory(arquivo: string): string {
  return arquivo.replace(/\.tsx?$/, ".stories.tsx");
}

export function validarComponenteDeTela({
  nome,
  camada = "tela",
  fonteStory,
  fontesTestes,
}: {
  nome: string;
  camada?: string;
  fonteStory: string | undefined;
  fontesTestes: readonly string[];
}): string[] {
  const problemas: string[] = [];
  // Duas formas legítimas de uma story demonstrar um componente:
  // renderizá-lo em JSX, ou declará-lo em `component:` do meta — que
  // é o CSF3 idiomático e o que faz o Storybook derivar controles e
  // documentação de props a partir dos tipos.
  const emJsx = new RegExp(`<${nome}(?:\\s|/|>)`);
  const noMeta = new RegExp(`component:\\s*${nome}\\s*[,\\n]`);
  const mencao = new RegExp(`\\b${nome}\\b`);

  if (
    fonteStory === undefined ||
    (!emJsx.test(fonteStory) && !noMeta.test(fonteStory))
  ) {
    problemas.push(`${nome} não é renderizado em nenhuma story`);
  }
  if (
    CAMADAS_COM_TESTE_DE_CONTRATO.has(camada) &&
    !COMPONENTES_SEM_TESTE_DE_CONTRATO.has(nome) &&
    !fontesTestes.some((fonte) => mencao.test(fonte))
  ) {
    problemas.push(`${nome} não possui teste de contrato`);
  }

  return problemas;
}

/**
 * Confere a galeria inteira: cada arquivo de componente tem story ao
 * lado, e cada componente que ele exporta aparece renderizado nela.
 */
export function validarGaleria({
  componentes,
  stories,
  fontesTestes,
}: {
  componentes: readonly {
    arquivo: string;
    camada: string;
    exports: readonly string[];
    tipos: readonly string[];
  }[];
  /** Caminho da story -> conteúdo. */
  stories: ReadonlyMap<string, string>;
  fontesTestes: readonly string[];
}): string[] {
  return componentes.flatMap((componente) => {
    const nomes = componentesDoArquivo(componente);
    if (nomes.length === 0) return [];

    const caminho = caminhoDaStory(componente.arquivo);
    const fonteStory = stories.get(caminho);
    if (fonteStory === undefined) {
      return [`${componente.arquivo} não possui ${caminho}`];
    }

    return nomes.flatMap((nome) =>
      validarComponenteDeTela({
        nome,
        camada: componente.camada,
        fonteStory,
        fontesTestes,
      }),
    );
  });
}
