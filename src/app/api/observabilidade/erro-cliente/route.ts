import { NextResponse } from "next/server";
import { z } from "zod";
import { observabilidadeAtiva } from "@/observabilidade/config";
import { logger } from "@/observabilidade/logger";

const erroClienteSchema = z.object({
  name: z.string().max(80),
  digest: z.string().max(128).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!observabilidadeAtiva()) {
    return new NextResponse(null, { status: 204 });
  }

  const resultado = erroClienteSchema.safeParse(await request.json().catch(() => null));
  if (!resultado.success) {
    return NextResponse.json({ erro: "Evento inválido." }, { status: 400 });
  }

  logger.error(
    {
      clientErrorName: resultado.data.name,
      clientErrorDigest: resultado.data.digest,
    },
    "erro não tratado no cliente",
  );

  return new NextResponse(null, { status: 204 });
}
