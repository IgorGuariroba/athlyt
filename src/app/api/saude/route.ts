import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * Sonda de saúde do container (healthcheck do compose de produção).
 *
 * Verifica o que de fato impede o app de servir: a conexão com o
 * Postgres. Uma sonda que só devolvesse 200 estático manteria o
 * container marcado como saudável mesmo com o banco fora, e o
 * `depends_on: service_healthy` de quem depende dele perderia o
 * sentido.
 */
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    await db.execute(sql`select 1`);
    return Response.json(
      { status: "ok", banco: "ok" },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    // A causa não vai no corpo: a sonda é acessível pelo domínio
    // público e detalhes de conexão não devem vazar.
    return Response.json(
      { status: "degradado", banco: "indisponivel" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );
  }
}
