"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type Foto = { id: string; pose: string; data: string; condicoes: string | null; protocoloVersao: string; url: string };
export function ComparadorFotos({ fotos }: { fotos: Foto[] }) {
  const poses = [...new Set(fotos.map((foto) => foto.pose))];
  const [pose, setPose] = useState(poses[0] ?? "frente");
  const candidatas = useMemo(() => fotos.filter((foto) => foto.pose === pose), [fotos, pose]);
  const [anteriorId, setAnteriorId] = useState(""); const [atualId, setAtualId] = useState(""); const [zoom, setZoom] = useState(100);
  const anterior = candidatas.find((foto) => foto.id === anteriorId) ?? candidatas[1];
  const atual = candidatas.find((foto) => foto.id === atualId) ?? candidatas[0];
  const condicoesDiferentes = Boolean(anterior?.condicoes && atual?.condicoes && anterior.condicoes.toLowerCase() !== atual.condicoes.toLowerCase());
  const protocoloDiferente = Boolean(anterior && atual && anterior.protocoloVersao !== atual.protocoloVersao);
  return <div className="grid gap-4"><div className="grid grid-cols-3 gap-2"><label className="text-body-sm">Pose<select className="mt-1 w-full rounded-md border p-2" value={pose} onChange={(e) => { setPose(e.target.value); setAnteriorId(""); setAtualId(""); }}>{poses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</select></label><label className="text-body-sm">Anterior<select className="mt-1 w-full rounded-md border p-2" value={anterior?.id ?? ""} onChange={(e) => setAnteriorId(e.target.value)}>{candidatas.map((foto) => <option key={foto.id} value={foto.id}>{foto.data}</option>)}</select></label><label className="text-body-sm">Atual<select className="mt-1 w-full rounded-md border p-2" value={atual?.id ?? ""} onChange={(e) => setAtualId(e.target.value)}>{candidatas.map((foto) => <option key={foto.id} value={foto.id}>{foto.data}</option>)}</select></label></div>
    <label className="text-body-sm">Zoom {zoom}%<input className="w-full" type="range" min="100" max="200" value={zoom} onChange={(e) => setZoom(Number(e.target.value))}/></label>
    {anterior && atual ? <><div className="grid grid-cols-2 gap-2 overflow-hidden">{[anterior, atual].map((foto, indice) => <figure key={`${indice}-${foto.id}`} className="overflow-auto rounded-md bg-muted"><Image unoptimized src={foto.url} alt={`${indice ? "Foto atual" : "Foto anterior"}, ${pose}`} width={500} height={750} className="origin-top-left max-w-none object-contain" style={{ width: `${zoom}%`, height: "auto" }}/><figcaption className="sticky bottom-0 bg-background/90 p-2 text-body-sm">{foto.data} · {foto.condicoes || "condições não informadas"}</figcaption></figure>)}</div>{condicoesDiferentes || protocoloDiferente ? <p role="status" className="text-body-sm text-warning">{[condicoesDiferentes ? "Condições de captura diferentes" : "", protocoloDiferente ? "Protocolos diferentes" : ""].filter(Boolean).join("; ")}: comparação com confiança limitada.</p> : <p className="text-body-sm text-success">Mesma pose e protocolo compatível.</p>}</> : <p className="text-body-sm text-muted-foreground">São necessárias duas fotos da mesma pose para comparar.</p>}
  </div>;
}
