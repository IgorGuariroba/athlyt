# ADR 0001 — Mídia de Execução via ExerciseDB, espelhada no R2

Status: aceito — risco de licenciamento assumido para uso particular
Relacionado: `CONTEXT.md` (Mídia de Execução), `docs/planos/midia-de-execucao-exercisedb.md`

## Contexto

A Mídia de Execução era um SVG desenhado à mão (`ilustracao-execucao.tsx`,
676 linhas) com esqueletos articulados posados manualmente por padrão de
movimento. O `CONTEXT.md` já define o conceito como "animação/vídeo
demonstrativo do exercício vindo de banco aberto/licenciado hospedado em
storage privado" — a implementação artesanal era uma aproximação
temporária, não a definição-alvo.

A ExerciseDB (hoje AscendAPI) oferece GIF/vídeo real de execução, tier
gratuito V1 OSS (sem chave, 1.500 exercícios, GIF 180p) e tier pago V2
via RapidAPI (11.000 exercícios, vídeo MP4, sem marca d'água).

## Decisão

1. Consumir o tier V1 OSS gratuito (`oss.exercisedb.dev`) através de um
   adaptador isolado (`src/infra/exercisedb`), preparado para trocar
   para o tier V2 pago sem reescrever a UI.
2. Não usar 11.000 exercícios sem curadoria: um mapa manual e revisado
   (`src/domain/plano/midia-execucao.ts`) liga cada id do catálogo
   Athlyt (32 exercícios) ao exercício correspondente na ExerciseDB.
   Casamento por nome parecido sem revisão humana foi rejeitado — o
   risco é ensinar o movimento errado durante a série.
3. A mídia é espelhada no Cloudflare R2 (`midia-execucao/{id}.gif`) e
   servida por uma rota same-origin (`/api/midia-execucao/{id}`), não
   por hotlink direto ao CDN da ExerciseDB nem por URL assinada.
   Motivo: URL assinada expira em minutos e não cacheia de forma
   estável no service worker — na academia offline a imagem sumiria.
4. `DiagramaMuscular` (silhueta de músculos-alvo) e o texto
   `comoExecutar` permanecem. O `CONTEXT.md` cita animação e diagrama
   como papéis distintos; o texto é o fallback real para mapa ausente,
   offline sem cache ou falha de carregamento — nunca é removido.

## Licenciamento — risco aceito, não confirmação formal

O `CONTEXT.md` exige "banco aberto/licenciado". Os Termos de Uso da
ExerciseDB/AscendAPI (`https://dub.sh/exercisedb-api-tos`) não puderam
ser lidos de forma confiável (página Notion renderizada por JS, sem
texto acessível a leitura automatizada) — **não há confirmação textual
de que o espelhamento em storage próprio é permitido**.

O Athlyt é, hoje, uma aplicação de **uso particular**, sem usuários de
terceiros, sem monetização e sem redistribuição pública da mídia. Dado
esse contexto, o mantenedor decide **aceitar o risco** de rodar
`scripts/importar-midia-exercicios.ts --espelhar` sem confirmação
formal da licença, por:

- Escala mínima: 22 GIFs, uso pessoal, sem tráfego de terceiros.
- Sem intenção comercial nem concorrência com a AscendAPI.
- Bucket R2 privado, não exposto publicamente como dataset.

**Isto deixa de valer, e a licença deve ser reconfirmada antes de
qualquer mudança de escopo**, se o Athlyt passar a:
- Ter usuários além do mantenedor (uso multiusuário real, não apenas
  suporte técnico a multiusuário no código);
- Ser publicado, distribuído ou monetizado de qualquer forma;
- Expor o bucket R2 ou a rota de mídia fora do próprio uso.

Se, ao reconfirmar, a licença não permitir hospedagem própria, esta ADR
muda de decisão: o passo 3 cai e a rota `/api/midia-execucao` passa a
fazer proxy (sem persistir) ou a UI usa a URL do CDN da ExerciseDB
diretamente — o que por sua vez exige revisar a redação de "storage
privado" no `CONTEXT.md`.

## Consequências

- `ilustracao-execucao.tsx` e sua amostra em `/design` foram removidos;
  não há mais produção manual de ilustração de exercício.
- O catálogo de 32 exercícios do Athlyt continua sendo a fonte da
  verdade da prescrição; a ExerciseDB é só camada de mídia.
- Mapa de mídia é parcial por natureza: exercícios sem entrada curada
  usam o fallback em texto até receberem correspondência revisada.
- Falha em qualquer parte da cadeia de mídia (sem R2, sem mapeamento,
  objeto ausente, erro de carregamento no cliente) degrada para o
  fallback em texto — nunca gera erro 500 nem tela em branco.
