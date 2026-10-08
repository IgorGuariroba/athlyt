import { drizzle } from "drizzle-orm/postgres-js";
import { instrumentarPostgres } from "@/observabilidade/postgres";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL não está definida.");
}

const queryClient = instrumentarPostgres(postgres(connectionString));

export const db = drizzle(queryClient, { schema });
