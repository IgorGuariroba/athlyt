import { GitBranch, RefreshCw, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { sair, sairDeTodosDispositivos } from "../../(auth)/actions";
import { Button } from "@/components/ui/button";
import {
  CabecalhoTela,
  CartaoLista,
  ItemNavegacao,
  LinhaCartaoLista,
  LinhasCartaoLista,
  ListaNavegacao,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";

/**
 * Casco da aba Mais (telas 075–085). Perfil, Trilhas de Decisão,
 * consentimentos, exportação e configurações são acessados daqui,
 * mantendo controles de conta e privacidade no mesmo casco.
 *
 * Os destinos formam uma `ListaNavegacao` única, e não um cartão por
 * item: é o padrão de "More" do MacroFactor
 * (`147-mais-configuracoes.JPG`) e evita repetir superfície elevada
 * para relações idênticas.
 */
export default async function MaisPage() {
  const session = await auth();

  return (
    <TelaConteudo>
      <CabecalhoTela titulo="Mais" />

      <SecoesTela>
        <CartaoLista>
          <LinhasCartaoLista>
            <LinhaCartaoLista
              titulo={session?.user?.name ?? session?.user?.email ?? "Conta"}
              meta={session?.user?.email}
            />
          </LinhasCartaoLista>
        </CartaoLista>

        <ListaNavegacao>
          <ItemNavegacao
            href="/mais/trilhas"
            Icone={GitBranch}
            rotulo="Trilhas de Decisão"
            descricao="Dados e regras por trás de cada recomendação"
          />
          <ItemNavegacao
            href="/mais/consentimentos"
            Icone={ShieldCheck}
            rotulo="Consentimentos"
            descricao="Armazenamento privado e operações de IA"
          />
          <ItemNavegacao
            href="/mais/sincronizacao"
            Icone={RefreshCw}
            rotulo="Sincronização"
            descricao="Pendências de envio e conflitos"
          />
        </ListaNavegacao>

        <div className="flex flex-col gap-2">
          <form action={sair}>
            <Button type="submit" variant="secondary" className="w-full">
              Sair
            </Button>
          </form>
          <form action={sairDeTodosDispositivos}>
            <Button type="submit" variant="ghost" className="w-full">
              Sair de todos os dispositivos
            </Button>
          </form>
        </div>
      </SecoesTela>
    </TelaConteudo>
  );
}
