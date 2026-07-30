/**
 * Carrega o `.env` antes de qualquer import que leia `process.env` no
 * topo do módulo (ex.: `src/db/client.ts`).
 *
 * Necessário porque `import` é içado acima das instruções do módulo:
 * chamar `config()` no corpo do script rodaria tarde demais.
 */
import { config } from "dotenv";

config({ path: ".env" });
