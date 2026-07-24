// Dummy: os testes de jornada nunca abrem conexão real — o cliente
// postgres-js só conecta na primeira query. Isolar o efeito de import
// de src/db/client.ts (exigido pelo DrizzleAdapter) dos testes que só
// exercitam callbacks puros, sem precisar de um Postgres real.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.AUTH_SECRET ??= "test-secret";
process.env.AUTH_GOOGLE_ID ??= "test-google-id";
process.env.AUTH_GOOGLE_SECRET ??= "test-google-secret";
