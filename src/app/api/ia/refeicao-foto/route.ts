import { auth } from "@/auth";
import { estimarRefeicao } from "@/app/(app)/diario/registrar/foto/servico";

export const runtime = "nodejs";

export type EventoEstimativaFoto =
  | { tipo: "inicio"; mensagem: string }
  | { tipo: "alternativa"; mensagem: string }
  | { tipo: "ultima-alternativa"; mensagem: string }
  | { tipo: "heartbeat" }
  | { tipo: "sucesso"; estimativa: unknown }
  | { tipo: "indisponivel"; erro: string }
  | { tipo: "cancelada"; erro: string };

export async function POST(request: Request): Promise<Response> {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ erro: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  const userId = session.user.id;
  let corpo: FormData;
  try {
    corpo = await request.formData();
  } catch {
    return Response.json({ erro: "Não foi possível ler a foto." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const conexao = new AbortController();
  const signal = AbortSignal.any([request.signal, conexao.signal]);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let aberta = true;
      const emitir = (evento: EventoEstimativaFoto) => {
        if (!aberta) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(evento)}\n`));
        } catch {
          aberta = false;
        }
      };
      const heartbeat = setInterval(() => emitir({ tipo: "heartbeat" }), 15_000);

      void estimarRefeicao(corpo, {
        userId,
        signal,
        aoProgresso(evento) {
          if (evento.tipo === "inicio") emitir({ tipo: "inicio", mensagem: "Lendo a foto…" });
          if (evento.tipo === "alternativa") emitir({ tipo: "alternativa", mensagem: "A primeira opção está indisponível. Tentando uma alternativa…" });
          if (evento.tipo === "ultima-alternativa") emitir({ tipo: "ultima-alternativa", mensagem: "Tentando a última alternativa aprovada…" });
        },
      }).then((resultado) => {
        if (resultado.ok) emitir({ tipo: "sucesso", estimativa: resultado.estimativa });
        else if (resultado.cancelada) emitir({ tipo: "cancelada", erro: resultado.erro });
        else emitir({ tipo: "indisponivel", erro: resultado.erro });
      }).catch(() => {
        emitir({ tipo: "indisponivel", erro: "A estimativa está indisponível agora. Nada foi registrado." });
      }).finally(() => {
        clearInterval(heartbeat);
        if (aberta) controller.close();
        aberta = false;
      });
    },
    cancel() {
      conexao.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
