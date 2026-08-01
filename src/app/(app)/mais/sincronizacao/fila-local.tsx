"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { CloudOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { assinarOutbox, drenarFila, lerOutbox, lerOutboxServidor, recarregarFila } from "@/lib/store-outbox";
import { useOnline } from "@/lib/use-online";

const ROTULO_TIPO: Record<string, string> = {
  serie_registrada: "Série registrada",
  sessao_concluida: "Sessão concluída",
  sessao_abandonada: "Sessão abandonada",
  sessao_iniciada: "Sessão iniciada",
  exercicio_substituido: "Exercício substituído",
};

/**
 * Metade da tela 085 que só o dispositivo conhece. Lista o que ainda
 * não chegou ao servidor com o carimbo do aparelho, para que "0 na
 * fila" seja uma afirmação verificável e não uma promessa.
 */
export function FilaLocal() {
  const router = useRouter();
  const online = useOnline();
  const { fila } = useSyncExternalStore(assinarOutbox, lerOutbox, lerOutboxServidor);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  /**
   * Retoma a drenagem ao abrir a tela estando online.
   *
   * A fila pode ter ficado pela metade porque o usuário saiu da
   * sessão antes de ela terminar de subir — navegar cancela as
   * requisições em voo. Mostrar pendências numa tela online sem tentar
   * enviá-las transformaria o painel de sincronização num relatório de
   * problema em vez de um caminho de saída.
   */
  useEffect(() => {
    void (async () => {
      const pendentes = await recarregarFila();
      if (!navigator.onLine || pendentes.length === 0) return;
      for (const sessionId of new Set(pendentes.map((evento) => evento.sessionId))) {
        await drenarFila(sessionId);
      }
      await recarregarFila();
      router.refresh();
    })();
  }, [online, router]);

  async function sincronizarTudo() {
    setOcupado(true);
    setErro(null);
    try {
      // Uma chamada por sessão: o endpoint é por sessão porque é lá
      // que o bloqueio pessimista faz sentido.
      for (const sessionId of new Set(fila.map((evento) => evento.sessionId))) {
        await drenarFila(sessionId);
      }
      router.refresh();
    } catch {
      setErro("Não foi possível sincronizar agora. A fila foi preservada e pode ser reenviada.");
    } finally {
      setOcupado(false);
      await recarregarFila();
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-title font-bold">Pendências ({fila.length})</h2>
        <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          {online ? <RefreshCw className="size-3.5" aria-hidden /> : <CloudOff className="size-3.5 text-warning" aria-hidden />}
          {online ? "Online" : "Offline"}
        </span>
      </div>

      {fila.length === 0 ? (
        <Card className="p-4"><p className="text-body-sm text-muted-foreground">Tudo sincronizado. Nenhum evento aguardando envio.</p></Card>
      ) : (
        <>
          <Card className="divide-y divide-border p-0">
            {fila.map((evento) => (
              <div key={evento.id} className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body-md">{ROTULO_TIPO[evento.tipo] ?? evento.tipo}</p>
                  <p className="text-caption text-muted-foreground">
                    {new Date(evento.ocorridoEm).toLocaleString("pt-BR")} · ordem {evento.ordem}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-caption text-muted-foreground">Aguardando</span>
              </div>
            ))}
          </Card>
          <Button onClick={sincronizarTudo} disabled={ocupado || !online} className="w-full">
            {ocupado ? "Sincronizando…" : online ? "Sincronizar agora" : "Sem conexão"}
          </Button>
        </>
      )}
      {erro ? <p role="alert" className="text-body-sm text-error">{erro}</p> : null}
    </section>
  );
}
