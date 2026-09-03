import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { consents, users } from "@/db/schema";
import { conceder, revogar } from "../consentimento";

describe("consentimento persistido", () => {
  it("conceder é idempotente e permite reconceder após revogar", async () => {
    const [user] = await db.insert(users).values({
      email: `consentimento-${randomUUID()}@example.com`,
    }).returning();

    await conceder(user.id, "avaliacao-visual", ["fotos-corporais"], "OpenRouter");
    await conceder(user.id, "avaliacao-visual", ["fotos-corporais"], "OpenRouter");

    const antesDeRevogar = await db.select().from(consents).where(eq(consents.userId, user.id));
    expect(antesDeRevogar).toHaveLength(1);

    await revogar(user.id, "avaliacao-visual", "fotos-corporais");
    await conceder(user.id, "avaliacao-visual", ["fotos-corporais"], "OpenRouter");

    const depoisDeReconceder = await db.select().from(consents).where(eq(consents.userId, user.id));
    expect(depoisDeReconceder).toHaveLength(2);
    expect(depoisDeReconceder.filter((consent) => consent.revogadoEm)).toHaveLength(1);
    expect(depoisDeReconceder.filter((consent) => !consent.revogadoEm)).toHaveLength(1);
  });
});
