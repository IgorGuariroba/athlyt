"use client";

import { createContext, useContext, useEffect, useReducer, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CircleDot, CloudOff, RefreshCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { assinarOutbox, drenarFila, lerOutbox, lerOutboxServidor, liberarRegistrosConfirmados, recarregarFila, registrarNaFila } from "@/lib/store-outbox";
import { useOnline } from "@/lib/use-online";
import type { SerieRegistrada, TipoEventoOutbox } from "@/domain/sessao/outbox";
import type { GatilhoCopiloto, ResultadoCopiloto } from "@/domain/sessao/copiloto";
import {
  ESTADO_INICIAL_COPILOTO,
  reduzirEstadoCopiloto,
  type EstadoCopilotoCliente,
} from "@/domain/sessao/copiloto-cliente";

/**
 * Estado de conexão e sincronização (user story 38; telas 042 e 085).
 *
 * Os cinco estados da spec são distintos de propósito e nenhum deles
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
  copiloto: EstadoCopilotoCliente;
  confirmarAlertaCautela: (exercicioId: string) => Promise<void>;
  /** Enfileira o evento localmente e tenta drenar em seguida. */
  registrar: (tipo: TipoEventoOutbox, dados: Record<string, unknown>, proximaSerie?: number) => Promise<void>;
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
  solicitarOrientacao = async () => ({ status: "indisponivel", motivo: "ação não configurada" }),
  continuarAposAlerta = async () => undefined,
  estadoForcado,
  children,
}: {
  sessionId: string;
  /** Séries que o servidor já tem como registradas, no HTML atual. */
  seriesConfirmadas: Array<{ exercicioId: string; numero: number }>;
  solicitarOrientacao?: (sessionId: string, gatilho: Omit<GatilhoCopiloto, "origem">) => Promise<ResultadoCopiloto>;
  continuarAposAlerta?: (sessionId: string, entrada: { exercicioId: string; proximaSerie: number; alerta: string }) => Promise<unknown>;
  /** Permite demonstrar e testar estados determinísticos sem manipular a rede do navegador. */
  estadoForcado?: EstadoConexao;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const online = useOnline();
  const outbox = useSyncExternalStore(assinarOutbox, lerOutbox, lerOutboxServidor);
  const [copiloto, despacharCopiloto] = useReducer(reduzirEstadoCopiloto, ESTADO_INICIAL_COPILOTO);
  const sequenciaCopiloto = useRef(0);

  // Drenagem automática: a mudança de `online` reexecuta o efeito, e a
  // fila sai sozinha ao voltar a rede — sem o usuário precisar pedir,
  // que é o requisito da user story 39.
  useEffect(() => {
    void recarregarFila(sessionId);
    if (!online) return;
    void drenarFila(sessionId).then(({ aplicou }) => { if (aplicou) router.refresh(); });
  }, [online, sessionId, router]);

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
      copiloto,
      confirmarAlertaCautela: async (exercicioId) => {
        if (copiloto.estado !== "orientacao" || !copiloto.orientacao.alertaCautela) return;
        await continuarAposAlerta(sessionId, {
          exercicioId,
          proximaSerie: copiloto.proximaSerie,
          alerta: copiloto.orientacao.alertaCautela,
        });
        despacharCopiloto({ tipo: "cautela-confirmada", proximaSerie: copiloto.proximaSerie });
      },
      registrar: async (tipo, dados, proximaSerie) => {
        await registrarNaFila(sessionId, tipo, dados);

        const requisicao = ++sequenciaCopiloto.current;
        if (tipo === "serie_registrada") {
          despacharCopiloto({ tipo: "serie-registrada", requisicao, proximaSerie: proximaSerie ?? null });
          if (!navigator.onLine && proximaSerie !== undefined) {
            despacharCopiloto({ tipo: "indisponivel", requisicao, proximaSerie, motivo: "offline" });
          }
        }

        const { aplicou } = await drenarFila(sessionId);
        if (aplicou) router.refresh();
        if (tipo !== "serie_registrada" || proximaSerie === undefined || !navigator.onLine) return;

        void solicitarOrientacao(sessionId, {
          exercicioId: String(dados.exercicioId),
          serieRegistrada: Number(dados.numero),
        }).then((resultado) => {
          if (resultado.status === "ok") {
            despacharCopiloto({
              tipo: "resposta-recebida",
              requisicao,
              proximaSerie: resultado.proximaSerie,
              orientacao: resultado.orientacao,
              versao: resultado.versao,
            });
          } else if (resultado.status === "indisponivel") {
            despacharCopiloto({ tipo: "indisponivel", requisicao, proximaSerie, motivo: "provedor-indisponivel" });
          }
        }).catch(() => {
          despacharCopiloto({ tipo: "indisponivel", requisicao, proximaSerie, motivo: "provedor-indisponivel" });
        });
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
