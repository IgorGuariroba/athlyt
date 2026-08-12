---
type: Development Learning
title: "Upload por Server Action estoura mudo no limite de 1 MB"
description: "Server Actions rejeitam o corpo acima de bodySizeLimit com 413 antes de a action rodar; nenhum erro chega à tela e o botão parece inerte."
tags: [nextjs, server-actions, upload, fotos, diagnostico, producao]
status: stable
generated:
  by: agente/claude-opus-4-6
  at: 2026-08-03T09:35:00-03:00
sources:
  - id: sessao-fotos-2026-08-03
    resource: "src/app/(auth)/triagem/avaliacao-corporal/fotos/, next.config.ts, log de produção da porta 3000"
    title: "Relato de que Enviar para storage privado e Continuar não faziam nada"
  - id: sessao-fotos-fatiado-2026-08-12
    resource: "src/app/(auth)/triagem/avaliacao-corporal/fotos/, e2e/fotos-r2.e2e.test.ts, evidencias-e2e/fotos-quatro-poses-envio-fatiado.webm"
    title: "Aviso 'envie em duas etapas' ao tentar mandar as quatro poses de uma vez"
---

# Contexto

Depois de redesenhar a tela de fotos da Avaliação Corporal Inicial, o relato foi: clicar em "Enviar para storage privado" ou em "Continuar" não fazia nada. O sintoma aponta para a UI recém-alterada — handler não ligado, botão fora do form, hidratação quebrada — e é aí que a investigação tende a começar.

O log de produção mostrava outra coisa:

```
Request body exceeded 10MB for /triagem/avaliacao-corporal/fotos
⨯ Error: Body exceeded 1 MB limit.  statusCode: 413
routeType: "action", routePath: "/triagem/avaliacao-corporal/fotos"
```

# Aprendizado

Server Actions do Next.js limitam o corpo a **1 MB** por padrão. O corpo é rejeitado com 413 no parser, **antes** de a action executar: nada dentro dela roda, `try/catch` na action não alcança o erro, nenhum `redirect` com mensagem acontece e a página fica presa no POST — o clique seguinte, mesmo em um `<Link>` de navegação, também não responde. Por isso dois controles diferentes parecem quebrados ao mesmo tempo, o que reforça a suspeita falsa de UI.[^sessao-fotos-2026-08-03]

Uma tela que promete "até 10 MB por foto" e aceita quatro arquivos contradiz o padrão do framework por um fator de dezenas. A validação de tamanho escrita na action (`LIMITE_FOTO_CORPORAL_BYTES`) nunca chega a ser consultada — ela protege o storage, não o transporte.

Aumentar `experimental.serverActions.bodySizeLimit` sozinho apenas move o teto: fotos de celular passaram de 3 a 8 MB e continuarão crescendo. O que estabiliza o transporte é **reduzir a imagem no navegador antes do envio** (`createImageBitmap` com `imageOrientation: "from-image"` → canvas → `toBlob("image/webp")`), com o limite do servidor como rede de segurança para navegadores sem esse suporte. A conversão no cliente é de transporte apenas; o recorte canônico — remoção de metadados e regravação — permanece no servidor, que não pode confiar no que o cliente enviou.

## Desdobramento: o teto agregado não pertence ao fluxo

Mesmo com redução no cliente e `bodySizeLimit` de 12 MB, quatro fotos em um único corpo voltaram a bater no teto. A tela então exibia "As fotos somam mais do que o envio suporta. Envie em duas etapas" — um limite de transporte transformado em tarefa do usuário: escolher, enviar, escolher de novo, enviar de novo.[^sessao-fotos-fatiado-2026-08-12]

Quando o corpo cresce com a quantidade de itens, o teto é acidental: some se cada item virar uma requisição. Fatiar o envio (uma Server Action por pose, disparada em sequência pelo cliente) mantém cada corpo pequeno **por construção**, independentemente de quantas fotos o usuário escolher. Consequências de projeto:

- a action passa a **retornar** erro em vez de `redirect`, porque quem coordena a sequência é o cliente e só ele sabe quando navegar;
- efeitos que valem para o conjunto e não para o item — aqui, o registro de consentimento — precisam de marcação explícita na primeira chamada, senão viram N registros de um único ato;
- falha no meio deixa as anteriores gravadas: a mensagem deve dizer a partir de qual item reenviar, em vez de mandar refazer tudo;
- o botão ganha progresso real ("Enviando 3 de 4…"), que só existe porque o envio é divisível.

## Desdobramento: o aviso precisa nascer onde a ação acontece

O mesmo relato trouxe um segundo sintoma idêntico ao de "botão inerte": a mensagem de erro existia, mas no **topo do formulário**, e o botão de envio ficava a várias dobras de distância numa tela com quatro seletores de arquivo, guia, retenção e consentimento. O usuário tocou em enviar várias vezes sem ver retorno algum e só encontrou o aviso ao rolar de volta ao topo por conta própria.[^sessao-fotos-fatiado-2026-08-12]

Um aviso fora do campo de visão é indistinguível de aviso inexistente. Duas garantias precisam vir juntas, e por isso moram no componente `@/components/tela/aviso-acao` em vez de em cada tela: o aviso é renderizado **adjacente ao controle que o originou**, e ao surgir ele se traz ao campo de visão (`scrollIntoView`) com foco programático — o que também faz o leitor de tela parar nele quando o usuário já navegou para outro ponto.

# Aplicação futura

Antes de pedir ao usuário que divida um envio, pergunte se o cliente pode dividi-lo sozinho. Mensagem de limite agregado é quase sempre sinal de que a granularidade da requisição está errada.

Ao construir qualquer envio de arquivo por Server Action:

1. some o tamanho realista de todos os campos do formulário e compare com o 1 MB padrão antes de escrever a UI;
2. reduza a imagem no cliente e só então monte o `FormData`, aplicando a orientação EXIF na conversão — o servidor descarta o metadado e não terá como corrigir depois;
3. ajuste `experimental.serverActions.bodySizeLimit` como margem, nunca como solução única;
4. valide com um arquivo grande de verdade (uma foto de celular, não um PNG sólido de 60 KB — imagem sintética comprime demais e passa no teste que o usuário reprova).

Diante de "cliquei e não aconteceu nada" em tela com upload, leia o log do servidor **antes** de inspecionar o componente. Um 413 no parser não produz rastro algum no navegador.

# Evidência

Com a foto reduzida no cliente, um JPEG de 4,2 MB completou o ciclo na URL de produção: redirecionamento para `?sucesso=Fotos%20armazenadas%20de%20forma%20privada.` e navegação normal para `/triagem/objetivo`, sem nenhuma nova ocorrência de "Body exceeded" no log.[^sessao-fotos-2026-08-03]

O E2E `envia as quatro poses em uma única interação` (`e2e/fotos-r2.e2e.test.ts`) sobe quatro JPEGs de 1400×2400 contra o R2 real, conclui com "Fotos armazenadas de forma privada", sem alerta de erro, e lista os quatro links assinados — cenário que antes exigia dois envios manuais.[^sessao-fotos-fatiado-2026-08-12]

[^sessao-fotos-2026-08-03]: Consulte `sources` com id `sessao-fotos-2026-08-03`.
[^sessao-fotos-fatiado-2026-08-12]: Consulte `sources` com id `sessao-fotos-fatiado-2026-08-12`.
