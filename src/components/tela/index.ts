/**
 * Kit de composição de telas — a camada entre os primitivos de
 * `components/ui` (shadcn) e as páginas.
 *
 * Cada componente aqui carrega uma decisão de DESIGN.md que, se ficasse
 * em classes soltas na página, seria reinventada (e divergida) a cada
 * tela nova. Ao construir uma tela, componha a partir daqui em vez de
 * repetir utilitários; se um caso não couber, ajuste o componente para
 * que a correção alcance todas as telas de uma vez.
 */
export { AvisoAcao } from "./aviso-acao";
export { BarraAcaoFixa } from "./barra-acao-fixa";
export { BarraFaixa } from "./barra-faixa";
export {
  BarraMacro,
  CORES_MACRO,
  MACROS,
  type Macro,
  type MacroEnergetico,
} from "./barra-macro";
export { CabecalhoSecao } from "./cabecalho-secao";
export { CabecalhoTela } from "./cabecalho-tela";
export { CascataShell } from "./cascata-shell";
export { CampoSelecao } from "./campo-selecao";
export {
  CabecalhoCartaoLista,
  CartaoLista,
  FaixaDados,
  LinhaCartaoLista,
  LinhasCartaoLista,
} from "./cartao-lista";
export { ChipSelecao } from "./chip-selecao";
export { CartaoSelecaoImagem } from "./cartao-selecao-imagem";
export { ControleSegmentado } from "./controle-segmentado";
export { EstadoErro } from "./estado-erro";
export { EstadoVazio } from "./estado-vazio";
export { ExplicacaoAgent } from "./explicacao-agent";
export {
  GraficoTendencia,
  type PontoSerie,
  type Serie,
} from "./grafico-tendencia";
export {
  calcularDeltaTendencia,
  LinhaTempoProgresso,
  SeloVariacao,
  suavizarTendencia,
  SparklineTendencia,
} from "./indicadores-tendencia";
export {
  GradeSelecaoFoto,
  ItemSelecaoFoto,
} from "./grade-selecao-foto";
export {
  ItemAcaoNavegacao,
  ItemNavegacao,
  ListaNavegacao,
} from "./lista-navegacao";
export { MedidorScore } from "./medidor-score";
export { PerfilUsuario } from "./perfil-usuario";
export { CartaoCheckbox, CartaoRadio } from "./opcao-cartao";
export { Metrica, PainelMetricas } from "./painel-metricas";
export { PainelPendencias, type ItemPendencia } from "./painel-pendencias";
export { PorQueIsso } from "./por-que-isso";
export { Revelar } from "./revelar";
export { NotaTela, SecoesTela, TelaConteudo } from "./tela-conteudo";
