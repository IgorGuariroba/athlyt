"use client";

import { useState } from "react";
import { CapturaFoto } from "@/components/fotos/captura-foto";

/**
 * A galeria é um Server Component e `CapturaFoto` é controlado por
 * callback; este invólucro existe só para segurar o estado da
 * demonstração.
 */
export function DemoCapturaFoto() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  return (
    <CapturaFoto
      arquivo={arquivo}
      aoEscolher={setArquivo}
      rotuloCaptura="Fotografar o prato"
      dica="Enquadre o prato inteiro, de cima. Um talher ao lado ajuda a estimar a porção."
    />
  );
}
