"use client";

import { createContext, useCallback, useContext, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CircleDot, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { assinarOutbox, drenarFila, lerOutbox, lerOutboxServidor, liberarRegistrosConfirmados, recarregarFila, registrarNaFila } from "@/lib/store-outbox";
import { useOnline } from "@/lib/use-online";
import { useTelaAtiva } from "@/lib/use-tela-ativa";
import type { SerieRegistrada, TipoEventoOutbox } from "@/domain/sessao/outbox";

/**
 * Os cinco estados de conexão e sincronização são distintos de
 * propósito e nenhum deles
 * pode ficar implícito: "offline" e "degradado" descrevem capacidades
 * diferentes — no primeiro o aparelho sabe que não há rede, no segundo
 * há rede mas o servidor não coopera — e "com conflito" é o único que
 * exige ação humana e por isso precede os demais no badge.
 */
export type EstadoConexao = "online" | "offline" | "sincronizando" | "conflito" | "degradado";

interface Contexto {
  estado: EstadoConexao;
  fila: number;
  conflitos: number;
  registrosLocais: SerieRegistrada[];
  /**
   * O treino foi encerrado neste aparelho, mesmo que o servidor ainda
   * não saiba. É fato compartilhado da sessão, e não estado privado do
   * botão: quem oferece registrar uma série precisa parar de oferecer.
   * Uma série enfileirada depois do encerramento tem ordem maior, chega
   * ao servidor sobre uma sessão já concluída e vira conflito.
   */
  encerradaLocalmente: boolean;
  /** Enfileira o evento localmente e tenta drenar em seguida. */
  registrar: (tipo: TipoEventoOutbox, dados: Record<string, unknown>) => Promise<void>;
}

const ContextoConexao = createContext<Contexto | null>(null);

export function useConexao(): Contexto {
  const contexto = useContext(ContextoConexao);
  if (!contexto) throw new Error("useConexao exige ProvedorConexao.");
  return contexto;
}

export function ProvedorConexao({
  sessionId,
  seriesConfirmadas,
  estadoForcado,
  encerradaForcada,
  children,
}: {
  sessionId: string;
  /** Séries que o servidor já tem como registradas, no HTML atual. */
  seriesConfirmadas: { exercicioId: string; numero: number }[];
  /** Permite demonstrar e testar estados determinísticos sem manipular a rede do navegador. */
  estadoForcado?: EstadoConexao;
  /** Mesma razão: demonstrar a sessão já encerrada neste aparelho sem encená-la. */
  encerradaForcada?: boolean;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const online = useOnline();
  // O provedor só existe enquanto a sessão está aberta, então seu ciclo
  // de vida é exatamente a janela em que a tela deve ficar acesa.
  useTelaAtiva();
  const outbox = useSyncExternalStore(assinarOutbox, lerOutbox, lerOutboxServidor);
  const [encerradaLocalmente, setEncerrada] = useState(false);

  /**
   * Rebusca o HTML do servidor — nunca sem rede.
   *
   * `router.refresh()` offline pede o RSC payload, falha com
   * `ERR_INTERNET_DISCONNECTED` e o Next cai para navegação do
   * navegador: sem rede isso troca a sessão em andamento pela página de
   * erro do Chrome, e o atleta perde a tela no meio do treino. A fila
   * local já mantém a UI correta até a rede voltar, quando o efeito de
   * drenagem acima refaz o refresh com o servidor alcançável.
   */
  const atualizarDoServidor = useCallback(() => {
    if (!navigator.onLine) return;
    router.refresh();
  }, [router]);

  // Drenagem automática: a mudança de `online` reexecuta o efeito, e a
  // fila sai sozinha ao voltar a rede, sem o usuário precisar pedir.
  useEffect(() => {
    void recarregarFila(sessionId);
    if (!online) return;
    void drenarFila(sessionId).then(({ aplicou }) => { if (aplicou) atualizarDoServidor(); });
  }, [online, sessionId, atualizarDoServidor]);

  // O HTML mais recente do servidor manda: o que ele já reflete sai do
  // espelho local, evitando que as duas fontes divirjam sem ninguém
  // notar.
  const chaveConfirmadas = seriesConfirmadas.map((s) => `${s.exercicioId}#${s.numero}`).join("|");
  useEffect(() => {
    liberarRegistrosConfirmados(seriesConfirmadas);
    // `seriesConfirmadas` é um array novo a cada render do servidor;
    // a chave textual é o que de fato muda.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chaveConfirmadas]);

  const estado: EstadoConexao = estadoForcado ?? (
    outbox.conflitos > 0 ? "conflito"
    : !online ? "offline"
    : outbox.sincronizando ? "sincronizando"
    : outbox.degradado ? "degradado"
    : "online"
  );

  return (
    <ContextoConexao.Provider value={{
      estado,
      fila: outbox.fila.length,
      conflitos: outbox.conflitos,
      registrosLocais: outbox.registrosLocais,
      encerradaLocalmente: encerradaForcada ?? encerradaLocalmente,
      registrar: async (tipo, dados) => {
        if (tipo === "sessao_concluida" || tipo === "sessao_abandonada") setEncerrada(true);
        await registrarNaFila(sessionId, tipo, dados);

        const { aplicou } = await drenarFila(sessionId);
        if (aplicou) atualizarDoServidor();
      },
    }}>
      {children}
    </ContextoConexao.Provider>
  );
}

const APARENCIA: Record<EstadoConexao, { rotulo: string; classe: string; Icone: typeof CircleDot }> = {
  online: { rotulo: "Online", classe: "text-success", Icone: CircleDot },
  offline: { rotulo: "Offline", classe: "text-warning", Icone: CloudOff },
  sincronizando: { rotulo: "Sincronizando", classe: "text-info animate-spin", Icone: RefreshCw },
  conflito: { rotulo: "Com conflito", classe: "text-error", Icone: TriangleAlert },
  degradado: { rotulo: "Degradado", classe: "text-warning", Icone: AlertTriangle },
};

/**
 * Badge sempre visível durante a sessão. Nunca some: um badge que
 * aparece só quando algo dá errado ensina o usuário a não procurá-lo.
 */
export function BadgeConexao() {
  const { estado, fila, conflitos } = useConexao();
  const { rotulo, classe, Icone } = APARENCIA[estado];
  const detalhe = conflitos > 0 ? `${conflitos} conflito${conflitos > 1 ? "s" : ""}` : fila > 0 ? `${fila} na fila` : null;

  return (
    <Link
      href="/mais/sincronizacao"
      aria-label={`Estado da conexão: ${rotulo}${detalhe ? `, ${detalhe}` : ""}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-container-high px-3 py-1.5 text-label-md"
    >
      <Icone className={`size-3.5 ${classe}`} aria-hidden />
      <span>{rotulo}</span>
      {detalhe ? <span className="text-muted-foreground">· {detalhe}</span> : null}
    </Link>
  );
}
