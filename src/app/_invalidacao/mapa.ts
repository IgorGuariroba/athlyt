/**
 * Mapa **fato do domínio → telas que o leem**.
 *
 * Quem escreve sabe o que mudou; não sabe — e não deveria precisar
 * saber — quais abas derivam daquilo. Antes deste arquivo a resposta
 * vivia replicada em 14 arquivos de action e completa em nenhum: a
 * mesma escrita de perfil invalidava três conjuntos diferentes de
 * rotas conforme quem a chamava, e duas actions redirecionavam para
 * uma tela que não invalidavam
 * (docs/memory/service-worker-serve-rsc-velho-apos-server-action.md).
 *
 * Este módulo é dado puro e não importa `next/cache`: a decisão de
 * *o que* invalidar é testável sem infraestrutura; *como* invalidar
 * fica em `./index.ts`. Hoje essas rotas são dinâmicas e, portanto, não
 * há Full Route Cache a purgar; o mapa continua documentando as
 * dependências para uma futura adoção de conteúdo cacheável.
 *
 * Importante: em uma Server Action, `revalidatePath` também purga o
 * Router Cache do cliente inteiro. O argumento `rota` não recorta essa
 * purga ao subtree nomeado; ele só identifica a entrada do Full Route
 * Cache (quando houver) e mantém explícita a dependência de domínio.
 */

/** Fato de domínio que uma escrita produziu. */
export type FatoMudado =
  | { fato: "perfil" }
  | { fato: "plano" }
  /** Sem `sessaoId` quando a escrita afeta o conjunto (ex.: fila de sincronização). */
  | { fato: "sessao"; sessaoId?: string }
  | { fato: "diario" }
  | { fato: "medicoes" }
  | { fato: "consentimento" }
  | { fato: "trilha" };

/**
 * `layout` alcança o subtree; `page` invalida só aquela rota.
 * São os dois valores que `revalidatePath` aceita.
 */
export type Alcance = "page" | "layout";

export interface Invalidacao {
  rota: string;
  alcance: Alcance;
}

const pagina = (rota: string): Invalidacao => ({ rota, alcance: "page" });
const subtree = (rota: string): Invalidacao => ({ rota, alcance: "layout" });

/**
 * Leitores de cada fato. O motivo de cada dependência mora aqui, junto
 * da entrada que ele governa — é a única cópia da regra.
 */
const LEITORES: Record<FatoMudado["fato"], readonly Invalidacao[]> = {
  // O perfil decide o Modo Conservador e os pendentes do Início, e a
  // cascata da Triagem repõe cada campo a partir do banco: sem o
  // subtree, voltar a uma etapa reapresenta o payload anterior à
  // gravação e o campo aparece vazio
  // (docs/memory/persistencia-visivel-apos-retorno.md).
  perfil: [
    pagina("/treino"),
    pagina("/mais/perfil"),
    pagina("/mais/modo-conservador"),
    pagina("/mais/objetivo"),
    subtree("/triagem"),
  ],
  // Plano Ativo, rascunho, experimento e reavaliação são lidos pelas
  // cinco etapas da Revisão Semanal e pelas telas de revisão do plano —
  // todas derivadas do mesmo registro, daí o subtree. O Cardápio
  // Diário sai do plano, então Diário e Dieta também mudam.
  plano: [
    pagina("/treino"),
    pagina("/dieta"),
    subtree("/diario"),
    pagina("/mais/plano"),
    subtree("/plano/revisao"),
    subtree("/progresso/revisao"),
    pagina("/progresso"),
  ],
  // O card "Treino do dia" do Início deriva do histórico de sessões, e
  // a fila de sincronização lista os conflitos das mesmas sessões.
  sessao: [
    pagina("/treino"),
    pagina("/sessao/historico"),
    pagina("/mais/sincronizacao"),
  ],
  // `/dieta` e `/diario` leem o mesmo `montarDiarioDoDia` — a divisão é
  // de recorte, não de dado. O subtree cobre a tela de uma refeição e a
  // biblioteca de alimentos usada no registro.
  diario: [subtree("/diario"), pagina("/dieta"), pagina("/treino")],
  // Peso, circunferências e gordura alimentam o panorama corporal, as
  // metas de proporção e as etapas de avaliação da Triagem.
  medicoes: [
    subtree("/progresso"),
    pagina("/treino"),
    subtree("/diario"),
    pagina("/dieta"),
  ],
  // Revogar consentimento remove análise visual e fotos do uso ativo.
  consentimento: [
    pagina("/mais/consentimentos"),
    subtree("/progresso"),
    pagina("/triagem/avaliacao-corporal/fotos"),
  ],
  trilha: [pagina("/mais/trilhas")],
};

/** Rotas derivadas de um fato que carrega identidade. */
function rotasDinamicas(fato: FatoMudado): readonly Invalidacao[] {
  // `/sessao/<id>` e `/sessao/<id>/resumo` são a mesma leitura em dois
  // recortes, e o resumo recalcula volume e recordes ao ser lido: sem o
  // subtree, concluir a sessão leva a um resumo do estado anterior.
  if (fato.fato === "sessao" && fato.sessaoId) {
    return [subtree(`/sessao/${fato.sessaoId}`)];
  }
  return [];
}

/** Caminho sem querystring nem fragmento, que é o que o App Router indexa. */
export function rotaDoDestino(destino: string): string {
  return destino.split(/[?#]/)[0] ?? "/";
}

/**
 * Rotas a invalidar depois de uma escrita.
 *
 * `destino` é o argumento do `redirect` que vem em seguida, quando vem.
 * Ele entra sempre no resultado, mesmo que nenhum fato o alcance: é o
 * que impede a repetição do defeito em que a action revalidava uma rota
 * e navegava para outra.
 */
export function rotasParaInvalidar(
  fatos: readonly FatoMudado[],
  opcoes?: { destino?: string },
): Invalidacao[] {
  const porRota = new Map<string, Alcance>();
  const registrar = ({ rota, alcance }: Invalidacao) => {
    // O subtree contém a página: quando os dois aparecem, o maior vence.
    if (porRota.get(rota) === "layout") return;
    porRota.set(rota, alcance);
  };

  for (const fato of fatos) {
    for (const leitor of LEITORES[fato.fato]) registrar(leitor);
    for (const leitor of rotasDinamicas(fato)) registrar(leitor);
  }
  if (opcoes?.destino) registrar(pagina(rotaDoDestino(opcoes.destino)));

  return [...porRota].map(([rota, alcance]) => ({ rota, alcance }));
}
