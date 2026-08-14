/**
 * Regras estáticas aplicadas ao conteúdo que o agente tenta escrever
 * em arquivos de interface.
 *
 * Cada regra existe porque a violação correspondente é o caminho fácil
 * (escrever `<button>` na página) e o caminho que fragmenta a interface:
 * a correção posterior precisa ser repetida em toda tela onde o atalho
 * foi tomado.
 */

export type Violacao = {
  regra: string;
  linha: number;
  trecho: string;
  motivo: string;
  correcao: string;
};

const MARCA_EXCECAO = /ui-excecao:/;

type Regra = {
  id: string;
  padrao: RegExp;
  motivo: string;
  correcao: string;
  ignorar?: (linha: string) => boolean;
};

const REGRAS: Regra[] = [
  {
    id: "composicao-crua",
    padrao: /import\s*\{[^}]*\bCard\b[^}]*\}\s*from\s*["']@\/components\/ui\/card["']/,
    motivo:
      "Card estrutural importado diretamente pela página permite recriar padrões visuais fora do kit de composição.",
    correcao:
      "Use um componente de `@/components/tela`. Se o padrão ainda não existir, crie-o nessa camada, exporte-o no catálogo e demonstre-o em `/design`.",
  },
  {
    id: "controle-cru",
    padrao: /<(button|select|textarea)\b/,
    motivo:
      "Controle HTML cru em tela: estados (hover, focus-visible, disabled, loading) e tokens ficam presos a esta tela.",
    correcao:
      "Use o componente do catálogo (`Button`, `Select`/`RadioGroup`, `Textarea` em `@/components/ui`). Se falta uma variante, adicione a variante ao componente — não recrie o controle na página.",
  },
  {
    id: "input-cru",
    padrao: /<input\b/,
    ignorar: (linha) => /type="hidden"/.test(linha),
    motivo: "Campo de entrada cru ignora altura mínima, foco e erro definidos no primitivo.",
    correcao: "Use `Input` de `@/components/ui/input` (campos `type=\"hidden\"` são permitidos).",
  },
  {
    id: "cor-literal",
    padrao: /(?:bg|text|border|fill|stroke|from|to|via)-\[#[0-9a-fA-F]{3,8}\]|:\s*"#[0-9a-fA-F]{3,8}"/,
    motivo:
      "Cor literal fora do sistema de tokens: a mesma cor passa a existir em versões divergentes por tela.",
    correcao:
      "Use um token semântico de `globals.css` (`bg-nutrition-protein`, `text-muted-foreground`, `border-border`...). Se o token não existe, crie-o em `globals.css` a partir de DESIGN.md.",
  },
  {
    id: "profundidade-decorativa",
    padrao: /\b(shadow-(?:sm|md|lg|xl|2xl)|drop-shadow-|bg-gradient-|backdrop-blur-)/,
    motivo:
      "DESIGN.md: elevação é tonal; sombras fortes, gradientes e glow não pertencem a componentes operacionais.",
    correcao:
      "Diferencie superfícies com `bg-surface-container` / `bg-surface-container-high` e `border-border`.",
  },
  {
    id: "tipografia-avulsa",
    padrao: /\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl)\b/,
    motivo: "Escala tipográfica genérica do Tailwind concorre com a escala de DESIGN.md.",
    correcao:
      "Use os tokens de tipografia do projeto (`text-display`, `text-headline-md`, `text-title`, `text-body-md`, `text-label-lg`, `text-caption`).",
  },
];

/** Arquivos de interface sujeitos às regras. */
export function ehArquivoDeInterface(caminho: string): boolean {
  const normalizado = caminho.split("\\").join("/");
  if (!normalizado.endsWith(".tsx")) return false;
  if (/\.(test|spec)\.tsx$/.test(normalizado)) return false;
  return normalizado.includes("/src/app/") || normalizado.startsWith("src/app/");
}

/** Arquivo do próprio catálogo: pode conter primitivos crus por definição. */
export function ehComponenteDoCatalogo(caminho: string): boolean {
  const normalizado = caminho.split("\\").join("/");
  return normalizado.includes("src/components/");
}

export function verificarConteudo(conteudo: string): Violacao[] {
  const violacoes: Violacao[] = [];
  const linhas = conteudo.split("\n");
  linhas.forEach((linha, indice) => {
    if (MARCA_EXCECAO.test(linha)) return;
    const anterior = linhas[indice - 1] ?? "";
    if (MARCA_EXCECAO.test(anterior)) return;
    for (const regra of REGRAS) {
      if (regra.ignorar?.(linha)) continue;
      const encontrado = linha.match(regra.padrao);
      if (!encontrado) continue;
      violacoes.push({
        regra: regra.id,
        linha: indice + 1,
        trecho: encontrado[0],
        motivo: regra.motivo,
        correcao: regra.correcao,
      });
    }
  });
  return violacoes;
}

export function formatarViolacoes(caminho: string, violacoes: Violacao[]): string {
  const linhas = violacoes.map(
    (v) =>
      `- linha ${v.linha} [${v.regra}] \`${v.trecho}\`\n  motivo: ${v.motivo}\n  correção: ${v.correcao}`,
  );
  return [
    `A escrita em ${caminho} foi bloqueada pela política de interface do Athlyt.`,
    ...linhas,
    "",
    "Antes de reescrever: chame `ui_catalogo` para ver o que já existe. Reutilize o componente; se ele não cobre o caso, ajuste/estenda o componente em `src/components/**` (para que toda tela receba a correção) e só então use-o aqui.",
    "Se a exceção for realmente justificada, anote `{/* ui-excecao: <motivo> */}` na linha anterior — ela fica visível na revisão.",
  ].join("\n");
}
