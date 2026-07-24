---
version: "1.0.0"
name: "MacroFactor Visual System"
description: "Sistema visual consolidado a partir de 186 referências do app móvel MacroFactor e da página pública macrofactor.com. Valores do app são aproximações visuais; a família Macro Sans e DM Sans foram confirmadas no site."
colors:
  primitives:
    black: "#000000"
    neutral-950: "#111111"
    neutral-900: "#171717"
    neutral-850: "#1D1D1D"
    neutral-800: "#242424"
    neutral-700: "#343434"
    neutral-600: "#565656"
    neutral-500: "#808080"
    neutral-400: "#A3A3A3"
    neutral-300: "#D4D4D4"
    neutral-100: "#F2F2F2"
    white: "#FFFFFF"
    blue-500: "#5878F3"
    violet-500: "#8B5CF6"
    orange-500: "#F58A5B"
    yellow-400: "#F3D765"
    green-500: "#66B98A"
    red-500: "#D75A5A"
  semantic:
    primary: "#FFFFFF"
    secondary: "#A3A3A3"
    background: "#111111"
    surface: "#171717"
    surface-container: "#1D1D1D"
    surface-container-high: "#242424"
    on-surface: "#F2F2F2"
    on-surface-strong: "#FFFFFF"
    muted: "#808080"
    border: "#343434"
    border-strong: "#565656"
    inverse-surface: "#FFFFFF"
    inverse-on-surface: "#111111"
    success: "#66B98A"
    warning: "#F3D765"
    error: "#D75A5A"
    info: "#5878F3"
    nutrition-protein: "#F58A5B"
    nutrition-fat: "#F3D765"
    nutrition-carbs: "#66B98A"
    nutrition-calories: "#5878F3"
    data-violet: "#8B5CF6"
typography:
  font-family:
    brand: "Macro Sans, DM Sans, system-ui, sans-serif"
    interface: "DM Sans, system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
  display: { size: "40px", line-height: "44px", weight: 700, letter-spacing: "-0.02em" }
  headline-lg: { size: "28px", line-height: "32px", weight: 700, letter-spacing: "-0.015em" }
  headline-md: { size: "22px", line-height: "28px", weight: 700, letter-spacing: "-0.01em" }
  title: { size: "18px", line-height: "24px", weight: 700, letter-spacing: "0" }
  body-lg: { size: "16px", line-height: "24px", weight: 400, letter-spacing: "0" }
  body-md: { size: "14px", line-height: "20px", weight: 400, letter-spacing: "0" }
  body-sm: { size: "12px", line-height: "16px", weight: 400, letter-spacing: "0.005em" }
  label-lg: { size: "14px", line-height: "20px", weight: 600, letter-spacing: "0" }
  label-md: { size: "12px", line-height: "16px", weight: 600, letter-spacing: "0.01em" }
  caption: { size: "10px", line-height: "14px", weight: 500, letter-spacing: "0.01em" }
spacing:
  primitive: { "0": "0", "1": "4px", "2": "8px", "3": "12px", "4": "16px", "5": "20px", "6": "24px", "8": "32px", "10": "40px", "12": "48px", "16": "64px" }
  semantic:
    screen-x: "16px"
    screen-top: "12px"
    section-gap: "24px"
    card-padding: "16px"
    control-gap: "12px"
    inline-gap: "8px"
rounded:
  none: "0"
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  pill: "999px"
components:
  button:
    height: "48px"
    compact-height: "36px"
    padding-x: "16px"
    radius: "6px"
  input:
    min-height: "48px"
    padding-x: "12px"
    radius: "6px"
  card:
    padding: "16px"
    radius: "8px"
    border-width: "1px"
  list-row:
    min-height: "52px"
    padding-x: "12px"
  top-bar:
    height: "48px"
  bottom-navigation:
    height: "64px"
  icon:
    sm: "16px"
    md: "20px"
    lg: "24px"
  touch-target-min: "44px"
---

## Overview

**Escopo.** Este documento descreve o sistema visual do aplicativo móvel MacroFactor. As 186 capturas em `workflow-imagens-references/macrofactor/` são a fonte principal para componentes e densidade; `https://macrofactor.com/` complementa marca e tipografia. O repositório não contém implementação, CSS, Tailwind, tema ou fontes do produto original.

**Personalidade — Confirmado:** científica, precisa, sóbria, não julgadora e orientada a dados. A interface evita decoração gratuita: quase todo elemento comunica estado, comparação, progresso ou ação. O preto é estrutural, não apenas “modo escuro”. Branco cria foco; cores são reservadas a séries, nutrientes, status e visualizações.

**Princípios:**

1. **Dados antes de decoração.** Estruture por comparação e leitura rápida.
2. **Densidade controlada.** Muitas informações cabem em tela, mas são agrupadas em cartões, seções e linhas previsíveis.
3. **Ação inequívoca.** Um CTA principal por etapa; ações secundárias recuam visualmente.
4. **Cor com significado.** Não usar cor de nutriente como ornamento.
5. **Neutralidade comportamental.** Feedback informa sem culpa, dramatização ou linguagem punitiva.
6. **Progressão explícita.** Onboarding e criação de programa mostram progresso, seleção e próxima ação.

**Relação app/site — Confirmado:** ambos usam preto, branco, formas compactas e uma tipografia geométrica. O site é mais publicitário, com títulos grandes em caixa alta e muito espaço negativo; o app é menor, mais denso e funcional. Não transportar literalmente a escala hero do site para telas operacionais.

## Colors

### Fontes e confiança

- **Confirmado no site:** `#000000`, `#FFFFFF`, `#F2F2F2`, `#222222`, `#808285`, `#D4D4D4`; extraídos de estilos computados via navegador.
- **Estimado no app:** neutros e acentos do YAML, extraídos visualmente das capturas e normalizados. Podem variar por compressão, brilho e captura.
- **Provável:** app usa superfícies em degraus muito próximos em vez de sombras fortes.

### Uso semântico

| Token | Uso | Regra |
|---|---|---|
| `background` | canvas das telas | Base contínua; não alternar preto e cinza sem motivo estrutural. |
| `surface` | barras e regiões discretas | Separação de primeiro nível. |
| `surface-container` | cartões, inputs, listas | Superfície operacional padrão. |
| `surface-container-high` | item selecionado, popover, controle elevado | Use com parcimônia. |
| `on-surface` | texto padrão | Contraste principal sobre fundos escuros. |
| `muted` | metadados, ajuda, estados vazios | Nunca para informação crítica. |
| `border` | contorno de cards/inputs e divisores | 1px, baixo contraste. |
| `primary` | CTA claro e seleção de alto foco | No app, frequentemente branco sobre escuro. |
| `info` | calorias, seleção ou série informativa | Não substituir o CTA branco por azul sem contexto. |
| `success` | conclusão, meta cumprida | Associar também a ícone/texto, não só cor. |
| `warning` | atenção e gordura/nutriente amarelo | O contexto determina o sentido. |
| `error` | validação e ação destrutiva | Reservado; evitar grandes áreas vermelhas. |

### Paleta de dados

**Confirmado:** calorias/macros e gráficos usam famílias cromáticas consistentes. **Estimado:** os hexadecimais exatos.

- Calorias/energia: `nutrition-calories`.
- Proteína: `nutrition-protein`.
- Gordura: `nutrition-fat`.
- Carboidratos: `nutrition-carbs`.
- Tendência secundária: `data-violet`.

Gráficos devem funcionar com legenda, rótulo ou padrão além da cor. Em superfícies escuras, linhas de grade usam `border` com baixa ênfase; séries ficam mais saturadas que eixos.

### Contraste

`on-surface` sobre `background` e `inverse-on-surface` sobre `inverse-surface` têm contraste plausivelmente superior a AA. `muted` é aceitável para texto grande ou secundário, mas deve ser validado para caption. Evite `muted` em controles desabilitados se isso tornar o rótulo ilegível; combine opacidade, contorno e estado não interativo.

## Typography

**Confirmado no site:** famílias computadas `Macro Sans` e `DM Sans`. **Não observável no app:** arquivo e versão exatos da fonte. **Provável:** a interface usa uma sans geométrica próxima de DM Sans; `Macro Sans` é mais apropriada à marca e a headlines promocionais. Alternativas compatíveis, no máximo duas: DM Sans e uma sans do sistema.

### Hierarquia

- `display`: marketing, onboarding introdutório ou resultados excepcionais; não usar em dashboards densos.
- `headline-lg`: pergunta principal de onboarding e títulos de apresentação.
- `headline-md`: títulos de páginas ou módulos importantes.
- `title`: cards, seções e modais.
- `body-lg`: explicações curtas de onboarding.
- `body-md`: conteúdo operacional e descrições.
- `body-sm`: metadados, unidades e texto auxiliar.
- `label-lg`: botões e controles primários.
- `label-md`: tabs, chips e labels de campos.
- `caption`: eixos, timestamps e informação terciária.

**Estimado:** tamanhos do YAML, normalizados para escala web/mobile. Nas capturas físicas do iPhone, a escala aparente pode corresponder a pontos, não pixels CSS.

### Regras

- Títulos do app usam sentence case; marketing pode usar caixa alta.
- Números de métricas têm peso 600–700 e unidade menor/menos contrastante.
- Evitar mais de três pesos na mesma região.
- Letter-spacing apertado somente em headlines; corpo permanece neutro.
- Valores tabulares devem usar algarismos tabulares se a fonte suportar.

## Layout

### Estrutura móvel

**Confirmado:** layout de coluna única, otimizado para telefone, respeitando safe areas. Cabeçalho, conteúdo rolável e CTA/barra inferior formam três zonas.

- **Margem horizontal — Estimado:** 16px; 20–24px em telas narrativas.
- **Largura de conteúdo:** viewport menos 32px; sem container estreito dentro do app.
- **Gap entre seções:** 24px.
- **Gap entre cards/linhas:** 8–12px.
- **Padding de card:** 12–16px.
- **CTA fixo:** alinhado ao rodapé com 16px laterais e safe area inferior.

### Grid e densidade

Use uma base de 4px e macro-ritmo de 8px. A interface combina:

- coluna única para formulários e settings;
- grids de 2 colunas para métricas e cartões compactos;
- 7 colunas para nutrição semanal;
- linha do tempo vertical para diário alimentar;
- carrossel horizontal para cards de foco e gráficos.

Não force todos os elementos a um grid de duas colunas: títulos e explicações ocupam largura total.

### Hierarquia espacial

1. Título/contexto.
2. Métrica ou pergunta principal.
3. controles/alternativas.
4. explicação auxiliar.
5. ação principal.

Divisores substituem espaço quando listas precisam ser densas; nunca use simultaneamente divisor forte, grande gap e superfície contrastante para separar a mesma relação.

## Elevation & Depth

**Confirmado:** elevação é principalmente tonal. Sombras são raras no app escuro. Superfícies mais claras avançam; fundo escurecido e folha/modal avançam ainda mais.

- Base: `background`.
- Card: `surface-container` + borda `border`.
- Item selecionado/popover: `surface-container-high` + `border-strong`.
- Modal/bottom sheet: superfície alta sobre overlay preto estimado em 40–60%.
- Site e diálogos claros podem usar sombra difusa, mas isso não é o padrão operacional do app.

Não usar sombras coloridas, glow ou elevação Material exagerada. Gráficos podem usar preenchimento translúcido sob linhas, não sombra.

## Shapes

**Confirmado:** geometria compacta, retângulos com cantos discretos e pills para filtros. O sistema evita cartões excessivamente arredondados.

- Inputs e botões: `rounded.sm` ou `rounded.md`.
- Cards: `rounded.md`.
- Modais e painéis: `rounded.lg` nos cantos expostos.
- Chips, segmented controls e avatares: `rounded.pill`.
- Gráficos de progresso podem empregar hexágonos como forma semântica, não como padrão universal.

Use linhas de 1px. Pills são para itens curtos e estados; não aplicar pill a cards longos.

## Components

### App bar

- **Finalidade:** contexto e navegação.
- **Anatomia:** ação voltar (20–24px), título central ou à esquerda, até duas ações finais.
- **Dimensão — Estimado:** 48px + safe area; padding lateral 16px.
- **Tipografia:** `label-lg` ou `title` compacto.
- **Cores:** `background`/`surface`, `on-surface`.
- **Estados necessários:** padrão, rolado com divisor, ação desabilitada.
- **Regra:** não exceder duas ações textuais/ícones no lado direito.

### Bottom navigation

- **Finalidade:** alternar áreas principais (Dashboard, Food Log, adicionar, Strategy, More).
- **Anatomia:** 4 destinos + ação central circular.
- **Dimensão — Estimado:** 60–68px + safe area; ícones 20px; captions 10px.
- **Cores:** superfície escura; ativo em branco, inativo em `muted`; ação central clara com ícone escuro.
- **Estados:** ativo, inativo, pressionado; badge é necessário, mas não observado.
- **Não usar:** em onboarding, fluxo modal ou tarefa focada.

### Primary button

- **Finalidade:** única ação de avanço/conclusão.
- **Anatomia:** label central; ícone opcional 16–20px.
- **Dimensões:** 48px de altura, largura do container; compacto 36px.
- **Cores:** `inverse-surface` / `inverse-on-surface`.
- **Borda/raio:** sem borda ou `border`; 6px.
- **Estados observados:** habilitado branco, desabilitado cinza escuro, loading e selecionado por contexto.
- **Estados necessários:** hover (web), focus-visible, pressed, loading, success.
- **Regra:** um por viewport; texto curto, verbo explícito.

### Secondary e tertiary buttons

Secondary: fundo `surface-container-high`, texto claro e borda discreta. Tertiary: texto/ícone sem container. Destrutivo: texto `error`, superfície neutra; preencher de vermelho somente em confirmação crítica.

### Selection card / radio row

- **Finalidade:** escolher uma opção exclusiva no onboarding.
- **Anatomia:** ícone opcional, título, descrição e radio à direita.
- **Dimensão:** mínimo 52px; padding 12–16px; gap 8px.
- **Tipografia:** `label-lg` + `body-sm` muted.
- **Padrão:** fundo `surface-container`, borda 1px; selecionado com `border-strong`, leve elevação tonal e radio preenchido.
- **Estados:** padrão, selecionado, pressed, disabled, focus.
- **Regra:** empilhar verticalmente; não usar checkbox para escolha exclusiva.

### Checkbox e switch

Checkboxes aparecem em seleção de dias e consentimentos. Switches controlam visibilidade, integrações e preferências.

- Touch target 44px, controle visual ~20–28px.
- Off: trilho `neutral-700`, indicador muted.
- On: indicador claro e trilho de maior contraste; em listas nutricionais, cor da categoria pode identificar a linha, mas não deve substituir estado.
- Consentimento exige label completo e link legal.
- Necessário: foco, disabled e indeterminate para checkbox, embora não observados.

### Text field, select e picker

- **Anatomia:** label acima ou dentro da seção, valor, unidade/chevron e erro abaixo.
- **Dimensão:** mínimo 48px; padding 12px; raio 6px.
- **Cores:** `surface-container`, texto claro, placeholder `muted`, borda `border`.
- **Focus:** `border-strong`/branco; erro em `error` com mensagem textual.
- **Variantes:** numérico, unidade acoplada, date picker, wheel picker, search.
- **Regra:** unidades ficam próximas do valor e não no placeholder.

### Segmented control, tabs e chips

- **Finalidade:** alternar período, métrica, consumed/remaining ou subview.
- **Dimensão:** 32–36px; padding 8–12px.
- **Ativo:** superfície branca com texto escuro ou superfície alta com texto branco, conforme contraste do grupo.
- **Inativo:** transparente/muted.
- **Regra:** 2–6 opções curtas; para mais opções, usar select ou scroll horizontal.

### Card

- **Finalidade:** agrupar uma unidade de informação ou ação.
- **Anatomia:** header opcional, métrica, conteúdo, legenda/ação.
- **Dimensão:** variável; padding 16px; raio 8px; borda 1px.
- **Variantes:** métrica, insight, hábito, seleção, gráfico e marketing.
- **Estados:** normal, selecionado, vazio, loading, bloqueado e interativo.
- **Regra:** evite cards aninhados em mais de dois níveis; não transforme toda linha em card se divisores bastarem.

### Metric card

Valor principal em `headline-md` ou `headline-lg`, unidade em `body-sm`, período em caption. Tendência inclui direção, janela temporal e cor semântica, jamais apenas “verde = bom/vermelho = ruim” para peso ou alimentação.

### Chart card

- Header com título e filtro/período.
- Plot com linhas de grade discretas.
- Legenda próxima ao gráfico.
- Touch/hover revela tooltip com data e valor.
- Estados: dados, sem dados, loading e erro.
- Eixos em `caption`; séries em tokens de dados.
- Não truncar unidade nem remover contexto temporal.

### Weekly nutrition grid

Sete colunas, uma por dia, com barras/segmentos de calorias e macros. Dia ativo recebe contorno claro. Totais ficam alinhados à direita. Em larguras menores, preservar sete colunas reduzindo labels, não quebrar em duas linhas.

### Timeline / food log

- Eixo vertical temporal com horas à esquerda e itens à direita.
- Item inclui alimento, quantidade/macros e ação contextual.
- Busca e botão adicionar permanecem acessíveis no rodapé.
- Estado vazio mantém a escala temporal para ensinar a estrutura.
- Drag/reorder é provável, mas **não observável**.

### Settings list

Seções com heading pequeno, linhas de 48–56px, label à esquerda e valor/chevron/switch à direita. Divisor de baixo contraste. Ações destrutivas ficam em grupo separado. Não usar cards individuais para cada item quando pertencem à mesma seção.

### Modal e bottom sheet

- Overlay escuro; conteúdo com cantos superiores 12–16px.
- Handle opcional, título, conteúdo rolável e ação inferior.
- Confirmações críticas devem oferecer cancelar e confirmar.
- Não empilhar sheets; fechar o atual antes de abrir outro.

### Alert, helper e validation

Alerts usam ícone + título + corpo. Info usa `info`; erro usa `error`; sucesso usa `success`. Mensagens aparecem junto ao campo/ação. A tela de nome obrigatório confirma erro inline vermelho. Evitar toast para falha que exige correção.

### Empty, loading e locked states

- Empty: título curto, explicação e CTA quando existe próximo passo.
- Loading: spinner discreto e texto específico (“calculando”, “carregando”).
- Locked: explica o requisito para desbloqueio.
- Skeleton é necessário para dados remotos, mas **não observável**.

### Table / dense nutrient list

Em mobile, tabelas viram listas de label/valor ou grupos verticais. Nutrientes usam pequena marca colorida, nome e switch. Cabeçalhos permanecem visíveis por seção. Evitar grade completa com bordas em todas as células.

### Tooltip

**Provável:** usado em gráficos. Fundo `surface-container-high`, texto `body-sm`, raio 6px, padding 8px, valor e data. Deve permanecer dentro da viewport e ser acessível via foco/toque.

### Pagination

**Não observável como paginação numérica.** Carrosséis usam indicadores ou deslocamento horizontal; listas longas usam scroll contínuo. Não introduzir paginação numerada no app sem necessidade real.

## Iconography

**Confirmado:** ícones lineares, monocromáticos, compactos, com peso uniforme. Tamanhos predominantes estimados em 16, 20 e 24px. Ícones ativos podem receber container circular.

- Use símbolos familiares: voltar, adicionar, busca, barcode, câmera, chevron, editar, excluir.
- Ícone acompanha label em ações ambíguas.
- Cores seguem `on-surface`, `muted` ou semântica.
- Emojis aparecem em alimentos/marketing; não substituem ícones de navegação.
- **Não observável:** biblioteca exata. Use uma única família consistente; não misture filled e outline arbitrariamente.

## Imagery

O app é majoritariamente orientado a UI e dados. Imagens aparecem em:

- demonstrações de produto dentro de molduras de celular;
- câmera/scanner de alimentos;
- pequenos ícones/emoji de alimentos;
- avatares em depoimentos;
- ilustrações geométricas e orbitais no cálculo do programa.

Marketing usa fundos pretos, mockups nítidos e tipografia branca. Fotografias devem parecer naturais e funcionais, não banco de imagem fitness genérico. Screenshots mantêm alto contraste e podem ser recortados em dispositivos. Não aplicar filtros coloridos pesados a fotos de comida, pois prejudicam reconhecimento.

## Motion & Interaction

**Observado por estados estáticos:** progressão de onboarding, loading orbital, carrossel de apresentação, switches, seleção, sheets e gráficos interativos. **Não observável:** durações/easings reais.

Recomendação estimada:

- feedback de pressão: 80–120ms;
- troca de estado: 150–200ms;
- sheet/modal: 220–300ms;
- transição de página: 200–300ms;
- gráfico: 250–400ms, sem reanimar a cada scroll.

Use easing padrão suave (`ease-out` ao entrar, `ease-in` ao sair). Respeite `prefers-reduced-motion`: substitua órbitas, confetes e transições por fade curto ou estado instantâneo. Nunca bloqueie avanço apenas para completar animação decorativa.

## Content & Voice

**Confirmado:** direto, técnico sem ser hostil, explicativo e não moralizante. A descrição oficial enfatiza sustentabilidade e ausência de culpa.

- Perguntas de onboarding em linguagem simples.
- Labels curtos e orientados à tarefa: Next, Done, Save, Log Foods.
- Explique cálculos com contexto, unidade e período.
- Evite “falhou”, “ruim”, “trapaceou” e alertas punitivos.
- Use sentence case no produto; caixa alta apenas em headlines da marca.
- Não use exclamações em excesso.
- Datas, unidades e números obedecem ao locale.
- Acrônimos (BMR, kcal) precisam de explicação na primeira ocorrência.

## Responsive Behavior

### Mobile — Confirmado

Referência primária. Conteúdo em coluna única, CTA e navegação respeitando safe areas, scroll vertical e grids compactos. Landscape não é observável.

### Tablet — Provável

- Limitar formulários a 480–600px, centralizados.
- Dashboard pode usar duas colunas de cards.
- Timeline mantém coluna principal com painel auxiliar opcional.
- Não escalar tipografia proporcionalmente à tela.

### Web — Confirmado apenas para marketing

O site usa container largo centralizado, header horizontal e hero com três mockups. Para produto web, comportamento é **não observável**. Preserve tokens e hierarquia, mas não copie automaticamente o layout mobile ampliado.

Breakpoints exatos são **não observáveis**. Escolha por quebra de conteúdo, não por dispositivo nominal.

## Accessibility

- Contraste mínimo WCAG AA; validar `muted` e cores de gráfico.
- Touch target mínimo 44×44px.
- Foco visível de 2px em branco ou `info`, com offset.
- Todo ícone sem label precisa de nome acessível.
- Switch e checkbox devem expor estado programaticamente.
- Não comunicar seleção, tendência ou erro apenas por cor.
- Gráficos precisam de resumo textual/tabela acessível.
- Respeitar Dynamic Type; cards e botões devem crescer verticalmente.
- Conteúdo rolável não pode ficar escondido pelo CTA fixo.
- Modais prendem foco e devolvem foco ao fechar.
- Câmera e barcode precisam de alternativa manual.
- Redução de movimento e aumento de contraste devem ser suportados.

## Do's and Don'ts

### Faça

- Use preto e degraus sutis de superfície para estruturar.
- Reserve branco para foco, seleção e CTA principal.
- Agrupe dados por significado e tempo.
- Mostre unidade, período e origem do cálculo.
- Reutilize a paleta semântica de nutrientes.
- Dê estados vazios e de loading com explicação útil.
- Mantenha a voz neutra e orientadora.
- Use um CTA principal por etapa.

### Não faça

- Não transforme o sistema em um dark theme genérico com azul como CTA universal.
- Não use gradientes, glow ou sombras fortes em componentes operacionais.
- Não arredonde todos os elementos como pills.
- Não sobrecarregue cards com múltiplas bordas e fundos.
- Não use vermelho para alimento acima da meta como punição.
- Não omita unidades ou janela temporal de uma métrica.
- Não misture famílias de ícones.
- Não reproduza títulos promocionais gigantes dentro do dashboard.
- Não alegue precisão científica sem explicar cálculo ou fonte.

## Unknowns and Assumptions

1. **Fonte do app — Provável:** DM Sans ou família geométrica equivalente. `Macro Sans` e `DM Sans` foram confirmadas apenas no site por estilos computados. Inspecionar bundle/Figma para decisão definitiva.
2. **Cores do app — Estimado:** hexadecimais foram aproximados visualmente. Capturas JPG, brilho e perfil de cor podem alterar valores. Extrair tema do código/Figma para substituir estimativas.
3. **Medidas — Estimado:** normalizadas em escala de 4/8px. Capturas não permitem distinguir pt iOS de px CSS.
4. **Site versus app:** o site atual usa preto/branco e Macro Sans, mas alguns estilos computados pertencem a infraestrutura/consentimento e não ao app. O app prevalece para componentes.
5. **Tema claro:** aparece em páginas web incorporadas e em uma configuração de tema, mas não há conjunto completo de telas claras. Tokens claros completos são não observáveis.
6. **Estados não vistos:** hover, keyboard focus, erro de rede, offline, skeleton, badge e indeterminate precisam de especificação de produto/código.
7. **Motion:** durações e curvas são recomendações, não medições.
8. **Breakpoints:** não observáveis para o produto; somente o site público foi inspecionado em desktop.
9. **Iconografia:** biblioteca original não identificada.
10. **Contraste:** combinações principais são plausíveis, mas todos os tokens estimados devem passar por medição WCAG antes da implementação.
11. **Divergências de versão:** as capturas podem representar uma versão do app diferente do site atual; ao divergir, preservar padrões recorrentes das capturas e registrar a decisão.
12. **Código do produto:** não existe neste repositório. Foram encontrados apenas documentação e imagens; portanto, nenhum token de implementação pôde prevalecer sobre a análise visual.
