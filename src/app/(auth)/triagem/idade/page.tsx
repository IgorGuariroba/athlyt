import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { posicaoNaCascata, proximoDestinoCascata } from "@/domain/triagem/etapas";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { CascataShell } from "@/components/tela/cascata-shell";
import { EtapaForm } from "../_components/etapa-form";

export default async function IdadePage() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/");

  const perfil = await obterPerfilVigente(userId);
  const { indice, total } = posicaoNaCascata("idade");

  return (
    <CascataShell titulo="Qual é a sua data de nascimento?" indice={indice} total={total}>
      <EtapaForm etapaAtual="idade" proximaEtapa={proximoDestinoCascata("idade")}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dataNascimento">Data de nascimento</Label>
          <Input
            id="dataNascimento"
            name="dataNascimento"
            type="date"
            defaultValue={perfil?.respostas.dataNascimento}
            required
            className="h-12 text-base"
          />
        </div>
      </EtapaForm>
    </CascataShell>
  );
}
