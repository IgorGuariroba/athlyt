import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { sincronizarEventos } from "@/domain/sessao/sincronizacao";

/**
 * Endpoint idempotente da fila offline.
 *
 * É seguro chamar com o mesmo lote quantas vezes for preciso: o
 * `client_event_id` de cada evento é a chave de idempotência, e o
 * cliente só remove da fila o que voltar confirmado. Uma resposta
 * perdida no caminho de volta custa um reenvio, nunca um evento
 * duplicado.
 */
const eventoSchema = z.object({
  id: z.uuid(),
  sessionId: z.uuid(),
  tipo: z.enum(["sessao_iniciada", "serie_registrada", "exercicio_substituido", "sessao_concluida", "sessao_abandonada"]),
  ocorridoEm: z.iso.datetime(),
  ordem: z.number().int().nonnegative(),
  // A forma do conteúdo continua aberta aqui: quem decide se um
  // registro de série é admissível é o merge, que é o único que tem o
  // estado persistido da sessão em mãos. Enrijecer o schema resolveria
  // faixa e tipo, mas devolveria a regra a dois lugares.
  dados: z.record(z.string(), z.unknown()),
});

const corpoSchema = z.object({ eventos: z.array(eventoSchema).max(500) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ erro: "Sessão expirada." }, { status: 401 });

  const { id } = await params;
  const corpo = corpoSchema.safeParse(await request.json().catch(() => null));
  if (!corpo.success) return NextResponse.json({ erro: "Fila inválida." }, { status: 400 });
  if (corpo.data.eventos.some((evento) => evento.sessionId !== id)) {
    return NextResponse.json({ erro: "Evento não pertence à sessão." }, { status: 400 });
  }

  try {
    const resultado = await sincronizarEventos(session.user.id, id, corpo.data.eventos);
    return NextResponse.json({
      aplicados: resultado.aplicados,
      duplicados: resultado.duplicados,
      conflitos: resultado.conflitos.map((conflito) => ({ id: conflito.eventoId, motivo: conflito.motivo })),
      inadmissiveis: resultado.inadmissiveis.map((registro) => ({ id: registro.eventoId, motivo: registro.motivo })),
    });
  } catch {
    return NextResponse.json({ erro: "Sessão não encontrada." }, { status: 404 });
  }
}
