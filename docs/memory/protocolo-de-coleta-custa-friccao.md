---
type: Development Learning
title: "Rigor de coleta é decisão de produto, não detalhe de formulário"
description: "Quando um protocolo de coleta multiplica campos na tela, o custo de fricção precisa ser pesado explicitamente e a mudança percorre domínio e UI no mesmo conjunto."
tags: [produto, medicoes, formularios, dominio]
status: stable
generated:
  by: agente/claude-opus-4-1
  at: 2026-08-02T17:25:00-03:00
sources:
  - id: protocolo-fita-v2
    resource: src/domain/medicoes/index.ts
    title: "PROTOCOLO_CIRCUNFERENCIAS_VERSAO e consolidarCircunferencia — comentário registra a troca fita-v1 → fita-v2"
  - id: sessao-2026-08-02
    resource: "sessão de redesenho da Avaliação Corporal Inicial"
    title: "Objeção do usuário ao protocolo de duas leituras"
---

# Contexto

O protocolo de coleta definido no domínio exigia duas leituras por região e uma terceira em caso de divergência. Ao implementar as telas, isso produziu seis campos na triagem essencial e trinta na tela de proporções. O usuário rejeitou o desenho com uma objeção de produto, não de layout: *"não faz sentido eu medir a mesma parte do corpo 3 vezes; uma única medida serve — ao longo do tempo faz sentido tirar novas medidas das mesmas partes para medir a evolução"*.[^sessao-2026-08-02]

Antes disso, eu já havia tentado corrigir o sintoma duas vezes dentro da UI — primeiro escondendo o terceiro campo até o servidor pedir, depois preservando valores no erro. Ambas as correções eram válidas, mas nenhuma tocava a causa: o protocolo em si.

# Aprendizado

Um protocolo de coleta rigoroso não é gratuito: ele se paga em campos, toques e abandono, e a conta chega inteira na tela — em geral, na etapa de onboarding, onde o abandono é mais caro. Quando um requisito de qualidade de dado gera um formulário que o usuário considera absurdo, o conflito é real e pertence ao produto; ajustar a UI só o disfarça.

Dois pontos que sustentam a análise:

- **Distinga a fonte de erro que o protocolo controla da que realmente importa.** Repetir a leitura no mesmo minuto controla tremulação da mão; a variação que corrompe uma comparação mensal vem de medir em outro ponto anatômico, com outra postura. Instrução visível no momento da medida ataca a fonte dominante, com custo muito menor.
- **Rigor obrigatório pode produzir dado pior que rigor opcional.** Um usuário cansado de digitar copia a primeira leitura no segundo campo: amplitude zero, qualidade "alta" e confiança falsa — pior que registrar honestamente uma medida única com qualidade "moderada".

Quando a decisão muda, ela não é local. Percorre domínio (regra e versão do protocolo, registrada em comentário junto ao código), UI (todas as telas que coletam) e testes que afirmavam a regra antiga. Este repositório não mantém specs nem ADRs como fonte separada: a decisão e seu trade-off vivem como comentário no próprio código que a implementa.

# Aplicação futura

Ao implementar uma tela cujo protocolo multiplica entradas por item:

1. Some os campos resultantes antes de codificar. Se o total surpreender, leve o número ao usuário como decisão de produto, com o trade-off explícito, em vez de absorvê-lo no layout.
2. Ao propor a mudança, ofereça caminhos com custos declarados (manter, tornar opcional, remover) e diga qual requisito quebra com cada um.
3. Se o rigor cair, faça o dado declarar a incerteza resultante — versione o protocolo e rebaixe a qualidade registrada em vez de herdar a confiança do protocolo anterior. Registros antigos mantêm sua versão e não são reinterpretados.
4. Percorra `grep` pelo termo do protocolo em `src/`: a regra costuma estar repetida em várias telas e no domínio.
5. Registre as consequências negativas e a mitigação em comentário junto ao código que decide, não só a decisão em si.

Correções de UI (esconder campo, preservar valores no erro) são legítimas, mas não substituem a revisão do protocolo quando a objeção é sobre o esforço pedido, e não sobre onde o campo aparece.

# Evidência

O protocolo `fita-v1` (duas leituras, terceira por divergência) foi substituído por `fita-v2` (uma leitura, extras opcionais, qualidade `moderada` quando única). A triagem essencial passou de seis campos para três e a tela de proporções de trinta para dez; a mudança exigiu editar o domínio (`src/domain/medicoes/index.ts`, que documenta a troca em comentário), duas server actions e três páginas.[^protocolo-fita-v2]

[^protocolo-fita-v2]: Consulte `sources` com id `protocolo-fita-v2`.
[^sessao-2026-08-02]: Consulte `sources` com id `sessao-2026-08-02`.
