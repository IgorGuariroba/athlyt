/**
 * Composição da aba Diário.
 *
 * Mora aqui, e não na pasta da rota, porque uma peça de interface que
 * vive em `src/app/**` fica fora do catálogo, fora do Storybook e fora
 * da governança — foi assim que o painel de macros e os três cartões
 * da linha do tempo passaram meses sem demonstração nem teste.
 */
export { AcoesRegistro } from "./acoes-registro";
export { CapturaAudio } from "./captura-audio";
export { RegistroPorDescricao } from "./registro-por-descricao";
export { RevisaoEstimativa } from "./revisao-estimativa";
export {
  CartaoConsumo,
  CartaoRefeicaoPlanejada,
  CartaoSessaoDiario,
} from "./cartoes-diario";
export { LinhaDoTempoDiario } from "./linha-do-tempo";
export { LinhaDoTempoDia, contarItensDoDia } from "./linha-do-tempo-dia";
export { NavegacaoDia } from "./navegacao-dia";
export { PainelMacrosDia } from "./painel-macros-dia";
