/**
 * Migração de produção.
 *
 * Usa o migrator do `drizzle-orm` (dependência de produção) em vez do
 * `drizzle-kit`, que é devDependency e não existe na imagem final.
 * `drizzle-kit generate` continua sendo a ferramenta de autoria das
 * migrações em desenvolvimento; este script apenas aplica os arquivos
 * SQL já versionados em `drizzle/`.
 *
 * Roda como pre-deploy command no Dokploy, antes de o container novo
 * receber tráfego.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida.");
}

/**
 * `max: 1` porque o migrator adquire um lock de sessão: com pool o
 * lock poderia ser tomado numa conexão e liberado noutra.
 */
const sql = postgres(connectionString, { max: 1 });

try {
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  console.log("Migrações aplicadas.");
} finally {
  await sql.end();
}
