import "dotenv/config";
import { db } from "../src/db/client";
import { sessions, users } from "../src/db/schema";
import {
  DEV_SESSION_EMAIL,
  DEV_SESSION_TOKEN,
} from "../src/auth/dev-session";

async function main() {
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365);

  const [user] = await db
    .insert(users)
    .values({ email: DEV_SESSION_EMAIL, name: "Atleta Dev" })
    .onConflictDoUpdate({
      target: users.email,
      set: { name: "Atleta Dev" },
    })
    .returning({ id: users.id });
  if (!user) throw new Error("Falha ao criar usuário dev.");

  await db
    .insert(sessions)
    .values({
      sessionToken: DEV_SESSION_TOKEN,
      userId: user.id,
      expires,
    })
    .onConflictDoUpdate({
      target: sessions.sessionToken,
      set: { userId: user.id, expires },
    });

  console.log(`[dev] sessão local pronta para ${DEV_SESSION_EMAIL}`);
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error("[dev] falha ao preparar sessão local", error);
    process.exit(1);
  },
);
