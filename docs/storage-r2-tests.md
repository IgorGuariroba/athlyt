# Teste manual do R2

Defina `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` e `R2_BUCKET` no ambiente e execute:

```bash
npm run test:int -- src/infra/storage/__tests__/r2-real.int.test.ts
```

O teste grava um objeto temporário sob `testes-integracao/` e o remove ao final. Nunca use o bucket de produção para esta verificação.
