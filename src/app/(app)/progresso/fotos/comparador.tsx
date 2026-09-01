"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { CampoSelecao, EstadoVazio } from "@/components/tela";
import { ControleFaixa } from "@/components/ui/controle-faixa";

type Foto = {
  id: string;
  pose: string;
  data: string;
  condicoes: string | null;
  protocoloVersao: string;
  url: string;
};

/**
 * Comparação de duas fotos da mesma pose ao longo do tempo.
 *
 * Os dados de protocolo vêm antes da decoração e permanecem visíveis:
 * iluminação, horário e postura mudam a aparência sem que o corpo
 * tenha mudado, e fundir isso em "antes e depois" produziria uma
 * leitura falsa.
 */
export function ComparadorFotos({ fotos }: { fotos: Foto[] }) {
  const poses = [...new Set(fotos.map((foto) => foto.pose))];
  const [pose, setPose] = useState(poses[0] ?? "frente");
  const candidatas = useMemo(
    () => fotos.filter((foto) => foto.pose === pose),
    [fotos, pose],
  );
  const [anteriorId, setAnteriorId] = useState("");
  const [atualId, setAtualId] = useState("");
  const [zoom, setZoom] = useState(100);

  const anterior =
    candidatas.find((foto) => foto.id === anteriorId) ?? candidatas[1];
  const atual = candidatas.find((foto) => foto.id === atualId) ?? candidatas[0];

  const condicoesDiferentes = Boolean(
    anterior?.condicoes &&
      atual?.condicoes &&
      anterior.condicoes.toLowerCase() !== atual.condicoes.toLowerCase(),
  );
  const protocoloDiferente = Boolean(
    anterior && atual && anterior.protocoloVersao !== atual.protocoloVersao,
  );

  const opcoesPose = poses.map((item) => ({
    valor: item,
    rotulo: item.replaceAll("_", " "),
  }));
  const opcoesFoto = candidatas.map((foto) => ({
    valor: foto.id,
    rotulo: foto.data,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        <CampoSelecao
          compacto
          id="comparador-pose"
          rotulo="Pose"
          opcoes={opcoesPose}
          value={pose}
          onChange={(evento) => {
            setPose(evento.target.value);
            setAnteriorId("");
            setAtualId("");
          }}
        />
        <CampoSelecao
          compacto
          id="comparador-anterior"
          rotulo="Anterior"
          opcoes={opcoesFoto}
          value={anterior?.id ?? ""}
          onChange={(evento) => setAnteriorId(evento.target.value)}
        />
        <CampoSelecao
          compacto
          id="comparador-atual"
          rotulo="Atual"
          opcoes={opcoesFoto}
          value={atual?.id ?? ""}
          onChange={(evento) => setAtualId(evento.target.value)}
        />
      </div>

      <ControleFaixa
        id="comparador-zoom"
        rotulo="Zoom"
        valor={zoom}
        aoMudar={setZoom}
        minimo={100}
        maximo={200}
        formatarValor={(valor) => `${valor}%`}
      />

      {anterior && atual ? (
        <>
          <div className="grid grid-cols-2 gap-2 overflow-hidden">
            {[anterior, atual].map((foto, indice) => (
              <figure
                key={`${indice}-${foto.id}`}
                className="overflow-auto rounded-lg border border-border bg-surface-container"
              >
                <Image
                  unoptimized
                  src={foto.url}
                  alt={`${indice ? "Foto atual" : "Foto anterior"}, ${pose}`}
                  width={500}
                  height={750}
                  className="max-w-none origin-top-left object-contain"
                  style={{ width: `${zoom}%`, height: "auto" }}
                />
                <figcaption className="sticky bottom-0 bg-background/90 p-2 text-body-sm text-muted-foreground backdrop-blur">
                  {foto.data} · {foto.condicoes || "condições não informadas"}
                </figcaption>
              </figure>
            ))}
          </div>
          {condicoesDiferentes || protocoloDiferente ? (
            <p role="status" className="text-body-sm text-warning">
              {[
                condicoesDiferentes ? "Condições de captura diferentes" : "",
                protocoloDiferente ? "Protocolos diferentes" : "",
              ]
                .filter(Boolean)
                .join("; ")}
              : comparação com confiança limitada.
            </p>
          ) : (
            <p className="text-body-sm text-success">
              Mesma pose e protocolo compatível.
            </p>
          )}
        </>
      ) : (
        <EstadoVazio
          titulo="Faltam fotos para comparar"
          descricao="São necessárias duas fotos da mesma pose para montar a comparação."
        />
      )}
    </div>
  );
}
