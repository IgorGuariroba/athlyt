// Dummy: os testes de jornada nunca abrem conexão real — o cliente
// postgres-js só conecta na primeira query. Isolar o efeito de import
// de src/db/client.ts (exigido pelo DrizzleAdapter) dos testes que só
// exercitam callbacks puros, sem precisar de um Postgres real.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.AUTH_SECRET ??= "test-secret";
process.env.AUTH_GOOGLE_ID ??= "test-google-id";
process.env.AUTH_GOOGLE_SECRET ??= "test-google-secret";

// jsdom não implementa `scrollIntoView`, e `AvisoAcao` o usa para
// trazer o erro ao campo de visão. Sem o stub, qualquer teste que
// renderize um aviso derruba a suíte com um erro não capturado que não
// tem relação com o que estava sendo verificado.
if (typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
