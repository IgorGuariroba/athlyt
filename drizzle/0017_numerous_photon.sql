WITH duplicados AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY "userId", operacao, campo, "recorte_versao"
      ORDER BY "concedido_em", id
    ) AS numero
  FROM "consent"
  WHERE "revogado_em" IS NULL
)
UPDATE "consent" AS c
SET "revogado_em" = now()
FROM duplicados AS d
WHERE c.id = d.id AND d.numero > 1;

CREATE UNIQUE INDEX "consent_active_unique_idx" ON "consent" USING btree ("userId","operacao","campo","recorte_versao") WHERE "consent"."revogado_em" IS NULL;