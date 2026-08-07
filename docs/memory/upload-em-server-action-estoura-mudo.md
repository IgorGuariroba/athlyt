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

# Aplicação futura

Ao construir qualquer envio de arquivo por Server Action:

1. some o tamanho realista de todos os campos do formulário e compare com o 1 MB padrão antes de escrever a UI;
2. reduza a imagem no cliente e só então monte o `FormData`, aplicando a orientação EXIF na conversão — o servidor descarta o metadado e não terá como corrigir depois;
3. ajuste `experimental.serverActions.bodySizeLimit` como margem, nunca como solução única;
4. valide com um arquivo grande de verdade (uma foto de celular, não um PNG sólido de 60 KB — imagem sintética comprime demais e passa no teste que o usuário reprova).

Diante de "cliquei e não aconteceu nada" em tela com upload, leia o log do servidor **antes** de inspecionar o componente. Um 413 no parser não produz rastro algum no navegador.

# Evidência

Com a foto reduzida no cliente, um JPEG de 4,2 MB completou o ciclo na URL de produção: redirecionamento para `?sucesso=Fotos%20armazenadas%20de%20forma%20privada.` e navegação normal para `/triagem/objetivo`, sem nenhuma nova ocorrência de "Body exceeded" no log.[^sessao-fotos-2026-08-03]

[^sessao-fotos-2026-08-03]: Consulte `sources` com id `sessao-fotos-2026-08-03`.
