import { Lock } from "lucide-react";
import { redirect } from "next/navigation";
import { obterSessaoAtual } from "@/auth/sessao";
import { EnvioFotos } from "@/components/fotos/envio-fotos";
import {
  AvisoAcao,
  CabecalhoTela,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { configuracaoR2 } from "@/infra/storage";
import { enviarFotoCorporal } from "../../../../(auth)/triagem/avaliacao-corporal/fotos/actions";

export default async function EnviarFotosProgressoPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string }>;
}) {
  const session = await obterSessaoAtual();
  if (!session?.user?.id) redirect("/");

  const aviso = await searchParams;
  const storageDisponivel = Boolean(configuracaoR2());

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Fotos privadas"
        titulo="Enviar fotos corporais"
        descricao="Autorize o armazenamento ao enviar. A análise por IA continua sendo uma permissão separada."
        voltar={{ href: "/progresso/fotos", rotulo: "Voltar às fotos privadas" }}
      />

      <SecoesTela>
        {aviso.sucesso ? (
          <AvisoAcao tipo="sucesso">{aviso.sucesso}</AvisoAcao>
        ) : null}

        {storageDisponivel ? (
          <EnvioFotos
            action={enviarFotoCorporal}
            destinoSucesso="/progresso/fotos/enviar?sucesso=Fotos armazenadas de forma privada."
          />
        ) : (
          <AvisoAcao tipo="erro">
            <span className="flex items-start gap-3">
              <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              O armazenamento privado está temporariamente indisponível.
            </span>
          </AvisoAcao>
        )}
      </SecoesTela>

      <NotaTela>
        Você pode revogar esse consentimento e excluir as fotos em Mais,
        Consentimentos.
      </NotaTela>
    </TelaConteudo>
  );
}
