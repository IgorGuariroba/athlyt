import Link from "next/link";
import { ImageOff } from "lucide-react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import {
  CabecalhoTela,
  CartaoLista,
  EstadoVazio,
  LinhaCartaoLista,
  LinhasCartaoLista,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { obterPanoramaCorporal } from "@/domain/medicoes/repositorio";
import { criarStorageR2 } from "@/infra/storage";
import { ComparadorFotos } from "./comparador";

export default async function FotosProgressoPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const panorama = await obterPanoramaCorporal(session.user.id);
  const storage = criarStorageR2();
  const fotos = await Promise.all(
    panorama.fotos.map(async (foto) => ({
      id: foto.id,
      pose: foto.pose,
      data: foto.observadoEm.toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
      }),
      condicoes: foto.condicoes,
      protocoloVersao: foto.protocoloVersao,
      url: await storage.urlLeitura(foto.objectKey, 600),
    })),
  );

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Fotos privadas"
        titulo="Comparativo longitudinal"
        descricao="Compare a mesma pose sem transformar diferenças de protocolo em mudança corporal."
        voltar={{ href: "/progresso", rotulo: "Voltar ao Progresso" }}
      />

      <SecoesTela>
        {fotos.length === 0 ? (
          <EstadoVazio
            Icone={ImageOff}
            titulo="Nenhuma foto enviada"
            descricao="As fotos ficam em armazenamento privado e só são comparadas entre si."
          />
        ) : (
          <CartaoLista>
            <LinhasCartaoLista>
              <LinhaCartaoLista titulo="Comparação">
                <ComparadorFotos fotos={fotos} />
              </LinhaCartaoLista>
            </LinhasCartaoLista>
          </CartaoLista>
        )}

        <Button asChild variant="outline">
          <Link href="/progresso/avaliacao-visual">Avaliação visual</Link>
        </Button>
      </SecoesTela>

      <NotaTela>
        Iluminação, horário e postura mudam a aparência sem que o corpo tenha
        mudado — por isso o protocolo de cada foto fica visível na comparação.
      </NotaTela>
    </TelaConteudo>
  );
}
