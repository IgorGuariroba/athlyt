# Cloudflare R2 para fotos e testes reais

O projeto usa Cloudflare R2 conforme a ADR 0003. O R2 possui franquia gratuita, mas não é ilimitado; confirme no painel atual da Cloudflare as cotas de armazenamento e operações da conta.

## Configuração recomendada

1. Crie um bucket privado exclusivo para desenvolvimento/testes, por exemplo `athlyt-test`.
2. Não habilite domínio público nem `r2.dev` para o bucket.
3. Crie um token R2 limitado a **Object Read & Write** somente nesse bucket.
4. Preencha no `.env` local, sem versionar os valores:

```env
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=athlyt-test
```

O endpoint é derivado do `R2_ACCOUNT_ID`; não é preciso configurar CORS porque uploads e assinaturas são feitos pelo servidor do Athlyt.

## Verificação real

```bash
npm run storage:verificar
```

O comando cria um objeto pequeno em `verificacoes/`, confirma existência, lê por URL assinada e exclui o objeto em `finally`.

A suíte de integração também contém `r2-real.int.test.ts`. Ela é ignorada quando as quatro variáveis estão ausentes e executa contra o R2 real quando estão configuradas.

## Garantias do fluxo de fotos

- bucket privado;
- chave aleatória e isolada por usuário;
- somente JPG, PNG e WebP até 10 MB na entrada;
- rotação normalizada, metadados removidos e conversão para WebP;
- URL de leitura assinada por poucos minutos;
- consentimento de armazenamento separado do consentimento de análise por IA;
- falha fechada quando o R2 não está configurado;
- exclusão individual ou em lote antes de remover os registros do banco;
- retenção opcional de um ou dois anos, executada periodicamente com `npm run storage:retencao`;
- falhas de exclusão preservam o registro para reconciliação e nova tentativa.

## Avaliação visual real

```bash
npm run ia:verificar-visual
```

O comando usa duas imagens sintéticas efêmeras, valida a chamada multimodal, saída estruturada, faixa probabilística e identificação do modelo resolvido. O usuário, as Trilhas de teste e as imagens são removidos ao final.
