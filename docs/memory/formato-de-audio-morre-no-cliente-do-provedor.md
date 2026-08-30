---
type: Development Learning
title: "Formato de áudio é recusado pelo cliente do SDK, não pelo modelo"
description: "UnsupportedFunctionalityError de mídia é lançado ao montar a mensagem, antes da rede; a lista válida está no conversor do @ai-sdk/openai-compatible, não no catálogo do provedor."
tags: [ia, ai-sdk, audio, ffmpeg, diagnostico, producao]
status: stable
generated:
  by: agente/claude-sonnet
  at: 2026-08-30T11:50:00Z
sources:
  - id: log-producao
    resource: "log de produção 2026-08-30T11:34:34Z, operação refeicao-audio"
    title: "'audio media type audio/ogg' functionality not supported."
  - id: conversor-sdk
    resource: node_modules/@ai-sdk/openai-compatible/dist/index.js:115-124
    title: "getAudioFormat: só audio/wav e audio/mpeg; default retorna null"
  - id: teste
    resource: src/domain/alimentos/__tests__/audio-provedor.unit.test.ts
    title: "Trava a lista contra o conversor real do SDK"
  - id: correcoes-anteriores
    resource: "commits 286f298 (#159) e 61b530f (#160)"
    title: "Duas correções que trataram o formato errado"
---

# Contexto

A transcrição de áudio da refeição falhava em produção com "Não consegui
transcrever o áudio agora". A mensagem do log era
`AI_UnsupportedFunctionalityError: 'audio media type audio/ogg'`, e o
`ia.modelo` registrado era um modelo multimodal com áudio no catálogo do
OpenRouter.

Duas correções anteriores partiram da premissa de que o **endpoint** do
provedor recusava o formato: a primeira (#159) removeu `audio/mp4` da
lista de tipos aceitos, a segunda (#160) passou a converter MP4 para
OGG/Opus com FFmpeg. Nenhuma resolveu, porque OGG também é recusado — e
WebM, que é o que Chrome e Firefox gravam, sempre foi.

# Aprendizado

Erros de modalidade de mídia têm duas origens muito diferentes, e o
log parece igual:

1. **O endpoint recusa** — chega como erro de API, depois de a
   requisição sair da máquina. É o caso que `npm run ia:modalidades`
   cobre, consultando `architecture.input_modalities` no catálogo.
2. **O cliente recusa** — `UnsupportedFunctionalityError` é lançado
   dentro de `convertToOpenAICompatibleChatMessages`, ao traduzir a
   parte `file` para `input_audio`, **antes de qualquer rede**. O
   catálogo do provedor é irrelevante aqui: quem decide é
   `getAudioFormat` do `@ai-sdk/openai-compatible`, que mapeia apenas
   `audio/wav` e `audio/mpeg` e devolve `null` para todo o resto.[^conversor-sdk]

O nome da classe do erro é o discriminador: `AI_UnsupportedFunctionalityError`
sem `statusCode` e sem corpo de resposta nunca foi um "não" do modelo.

A consequência de produto é que **nenhum formato gravável pelo
MediaRecorder atravessa o cliente** — WebM no Chrome/Firefox, MP4 no
Safari. Converter no servidor é o caminho normal do fluxo, não o
tratamento de uma exceção de um navegador específico.

# Aplicação futura

Ao investigar falha de mídia numa operação de IA, leia o nome da classe
do erro antes de mexer na lista de formatos. Se for
`UnsupportedFunctionalityError`, abra o conversor do provider em
`node_modules` e leia o mapa de formatos: ele é a especificação real, e
é mais restrito que a documentação do provedor.

Ao aceitar mídia do navegador, separe as duas perguntas em duas listas —
`TIPOS_AUDIO_REFEICAO` (o que aceitamos receber) e
`TIPOS_AUDIO_PROVEDOR` (o que conseguimos enviar) — e normalize por
transcodificação entre elas. Recusar na fronteira de entrada devolve ao
usuário um erro por algo que o servidor sabe resolver.

Prefira travar esse contrato chamando o conversor real do SDK contra um
`baseURL` inalcançável: se a conversão passa, a falha é de rede; se não
passa, é o erro de produção. Mock não pega, e teste de integração com o
provedor também não, porque a exceção acontece antes da chamada.

# Evidência

O conversor do SDK, que é a especificação efetiva:[^conversor-sdk]

```js
function getAudioFormat(mediaType) {
  switch (mediaType) {
    case "audio/wav":  return "wav";
    case "audio/mp3":
    case "audio/mpeg": return "mp3";
    default:           return null;   // -> UnsupportedFunctionalityError
  }
}
```

Loop de diagnóstico, chamando `doGenerate` contra `http://127.0.0.1:1/v1`
— "bad port" significa que a conversão passou:

```
audio/webm -> AI_UnsupportedFunctionalityError: 'audio media type audio/webm'
audio/ogg  -> AI_UnsupportedFunctionalityError: 'audio media type audio/ogg'
audio/mp4  -> AI_UnsupportedFunctionalityError: 'audio media type audio/mp4'
audio/mpeg -> AI_APICallError: Cannot connect to API: bad port
audio/wav  -> AI_APICallError: Cannot connect to API: bad port
```

O OGG produzido pela correção #160 estava na primeira lista: a segunda
tentativa trocou um formato recusado por outro formato recusado.[^correcoes-anteriores]

Após a correção, com áudio gerado nos dois containers de navegador:

```
/tmp/nav.webm -> audio/mpeg 8577B | conversão OK (só rede falhou)
/tmp/nav.mp4  -> audio/mpeg 8820B | conversão OK (só rede falhou)
```

[^conversor-sdk]: `node_modules/@ai-sdk/openai-compatible/dist/index.js:115-124` (v3.0.17).
[^correcoes-anteriores]: commits `286f298` (#159) e `61b530f` (#160).
