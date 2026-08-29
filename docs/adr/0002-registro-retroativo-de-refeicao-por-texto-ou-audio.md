# ADR 0002 — Registro retroativo de refeição por texto ou áudio

Status: aceito
Relacionado: `CONTEXT.md` (Alimentação), operação `refeicao-texto`

## Contexto

O diário atualmente permite registrar uma divergência do plano por fotografia. Isso cria atrito quando o atleta não está com o celular no momento da refeição ou decide registrar refeições anteriores. O objetivo do diário é oferecer uma noção útil do consumo total e dos macros, não uma medição clínica ou precisão de 100%.

## Decisão

1. O cartão da refeição planejada manterá **Comi outra coisa**, mas o fluxo oferecerá foto, texto e áudio.
2. Texto e áudio serão entradas de um mesmo domínio de **Registro Retroativo**. O áudio será transcrito e a transcrição poderá ser editada antes da estimativa.
3. A IA estimará alimentos, porções, calorias, proteínas, carboidratos e gorduras, identificando o resultado como estimativa por descrição/áudio.
4. A estimativa será sempre apresentada para revisão. O atleta poderá editar itens e quantidades antes de confirmar.
5. O consumo real substituirá o consumo anteriormente registrado para aquela refeição e a refeição planejada poderá ser sobrescrita no registro do dia. O sistema avisará explicitamente quando houver substituição; o planejado original permanece disponível como referência.
6. O usuário escolherá ou editará o nome da refeição e poderá alterar o horário. Refeições sem planejamento aparecerão normalmente no diário.

## Consequências

- O diário passa a aceitar registros feitos depois da refeição e em dias anteriores.
- A operação `refeicao-texto` já prevista no contexto de IA será a base do fluxo; áudio adiciona transcrição, não um segundo cálculo nutricional.
- Estimativas terão menor confiança que dados de tabela e não devem ser exibidas como medição.
- Será necessário suportar confirmação de substituição, edição de itens, seleção de data/horário e persistência da origem do dado.
- Foto continua disponível para quem a tiver, mas deixa de ser requisito para registrar uma divergência.
