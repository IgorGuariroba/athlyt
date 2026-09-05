"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Gravação de um áudio curto, com prévia — o passo "conte o que você
 * comeu" antes de qualquer estimativa.
 *
 * Grava com `MediaRecorder` em vez de `<input type="file" capture>`
 * porque o que este componente encurta é justamente o gesto: o input
 * nativo abre o gravador do sistema, obriga a salvar um arquivo e a
 * voltar ao navegador — três telas para uma frase de dez segundos.
 *
 * A trilha do microfone é encerrada assim que a gravação termina. Sem
 * isso o indicador de microfone ativo permanece aceso depois de o
 * atleta ter parado de falar, o que é ao mesmo tempo um vazamento de
 * privacidade percebida e consumo de bateria.
 *
 * O componente não envia nada: entrega o `File` gravado e quem o usa
 * decide o destino.
 */
export function CapturaAudio({
  audio,
  aoGravar,
  duracaoMaximaSegundos = 120,
  dica,
  className,
}: {
  audio: File | null;
  aoGravar: (audio: File | null) => void;
  /** Corte automático: além disso a descrição deixou de ser uma refeição. */
  duracaoMaximaSegundos?: number;
  dica?: string;
  className?: string;
}) {
  const [gravando, setGravando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const gravador = useRef<MediaRecorder | null>(null);
  const [previa, setPrevia] = useState<{ de: File | null; url: string | null }>({
    de: null,
    url: null,
  });

  if (previa.de !== audio) {
    setPrevia({ de: audio, url: audio ? URL.createObjectURL(audio) : null });
  }

  useEffect(() => {
    const url = previa.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [previa.url]);

  useEffect(() => {
    if (!gravando) return;
    const id = setInterval(() => setSegundos((atual) => atual + 1), 1000);
    return () => clearInterval(id);
  }, [gravando]);

  useEffect(() => {
    if (gravando && segundos >= duracaoMaximaSegundos) parar();
  }, [gravando, segundos, duracaoMaximaSegundos]);

  async function iniciar() {
    setErro(null);
    if (typeof MediaRecorder === "undefined" || !("mediaDevices" in navigator)) {
      setErro("Este navegador não grava áudio. Escreva a descrição no lugar.");
      return;
    }
    try {
      const trilha = await navigator.mediaDevices.getUserMedia({ audio: true });
      const partes: Blob[] = [];
      const instancia = new MediaRecorder(trilha);
      instancia.ondataavailable = (evento) => {
        if (evento.data.size > 0) partes.push(evento.data);
      };
      instancia.onstop = () => {
        for (const canal of trilha.getTracks()) canal.stop();
        const tipo = instancia.mimeType || "audio/webm";
        const blob = new Blob(partes, { type: tipo });
        aoGravar(
          new File([blob], "descricao-refeicao", { type: tipo.split(";")[0].trim() }),
        );
        setGravando(false);
      };
      gravador.current = instancia;
      setSegundos(0);
      instancia.start();
      setGravando(true);
    } catch {
      setErro("Não consegui acessar o microfone. Autorize o acesso ou escreva a descrição.");
    }
  }

  function parar() {
    if (gravador.current?.state === "recording") gravador.current.stop();
  }

  function descartar() {
    aoGravar(null);
    setSegundos(0);
    setErro(null);
  }

  const relogio = `${String(Math.floor(segundos / 60)).padStart(2, "0")}:${String(
    segundos % 60,
  ).padStart(2, "0")}`;

  if (previa.url) {
    return (
      <div className={cn("flex flex-col gap-3", className)}>
        {/* Sem legenda: é a fala que o próprio usuário acabou de gravar,
            e a transcrição dela é o passo seguinte do fluxo. */}
        <audio src={previa.url} controls aria-label="Áudio gravado" className="w-full">
          <track kind="captions" />
        </audio>
        <Button type="button" variant="ghost" size="sm" onClick={descartar} className="self-start">
          <Trash2 className="size-4" aria-hidden="true" /> Gravar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {gravando ? (
        <Button type="button" size="cta" variant="destructive" className="w-full" onClick={parar}>
          <Square className="size-5" aria-hidden="true" /> Parar de gravar · {relogio}
        </Button>
      ) : (
        <Button type="button" size="cta" className="w-full" onClick={iniciar}>
          <Mic className="size-5" aria-hidden="true" /> Gravar descrição
        </Button>
      )}

      {erro ? (
        <p role="alert" className="text-body-sm text-destructive">
          {erro}
        </p>
      ) : null}

      {dica && !gravando ? (
        <p className="text-body-sm leading-relaxed text-muted-foreground">{dica}</p>
      ) : null}

      {gravando ? (
        <p aria-live="polite" className="text-body-sm text-muted-foreground">
          Gravando… descreva o que comeu e as porções aproximadas.
        </p>
      ) : null}
    </div>
  );
}
