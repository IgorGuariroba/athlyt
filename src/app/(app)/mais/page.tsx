import {
  BookOpen,
  Dumbbell,
  FlaskConical,
  GitBranch,
  LogOut,
  MonitorOff,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Target,
  UserRound,
} from "lucide-react";

import { auth } from "@/auth";
import {
  CabecalhoSecao,
  CabecalhoTela,
  ItemAcaoNavegacao,
  ItemNavegacao,
  ListaNavegacao,
  PerfilUsuario,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import { sair, sairDeTodosDispositivos } from "../../(auth)/actions";

/**
 * Aba Mais inspirada na anatomia da tela More do MacroFactor: identidade
 * diretamente sobre o fundo, seguida por grupos compactos de configurações.
 * Destinos relacionados dividem uma única superfície e divisores discretos.
 */
export default async function MaisPage() {
  const session = await auth();
  const email = session?.user?.email;
  const nome = session?.user?.name ?? email ?? "Conta Athlyt";

  return (
    <TelaConteudo>
      <CabecalhoTela titulo="Mais" className="pb-4" />

      <SecoesTela className="gap-8">
        <PerfilUsuario
          nome={nome}
          detalhe={session?.user?.name ? email : "Sua conta Athlyt"}
          imagem={session?.user?.image}
        />

        {/* Primeiro grupo, acima das configurações: o Diário é conteúdo
            de consulta, não ajuste de conta. Ele saiu da barra quando
            Dieta e Treino ganharam abas próprias, mas continua sendo o
            único lugar que mostra alimentação e treino no mesmo eixo do
            tempo. */}
        <section aria-labelledby="mais-registros" className="flex flex-col gap-3">
          <CabecalhoSecao id="mais-registros" titulo="Registros" />
          <ListaNavegacao>
            <ItemNavegacao
              href="/diario"
              Icone={BookOpen}
              rotulo="Diário do dia"
              descricao="Alimentação e treino na mesma linha do tempo"
            />
          </ListaNavegacao>
        </section>

        <section aria-labelledby="mais-plano" className="flex flex-col gap-3">
          <CabecalhoSecao id="mais-plano" titulo="Plano e estratégia" />
          <ListaNavegacao>
            <ItemNavegacao
              href="/mais/plano"
              Icone={Dumbbell}
              rotulo="Plano Ativo"
              descricao="Revise ou peça uma nova sugestão ao agent"
            />
            <ItemNavegacao
              href="/progresso/revisao/experimento"
              Icone={FlaskConical}
              rotulo="Experimentos de Plano"
              descricao="Acompanhe candidatos e restaure o Plano Estável"
            />
            <ItemNavegacao
              href="/mais/objetivo"
              Icone={Target}
              rotulo="Objetivo e estratégia"
            />
            <ItemNavegacao
              href="/mais/trilhas"
              Icone={GitBranch}
              rotulo="Trilhas de decisão"
            />
          </ListaNavegacao>
        </section>

        <section aria-labelledby="mais-perfil" className="flex flex-col gap-3">
          <CabecalhoSecao id="mais-perfil" titulo="Perfil e personalização" />
          <ListaNavegacao>
            <ItemNavegacao
              href="/mais/modo-conservador"
              Icone={ShieldAlert}
              rotulo="Modo conservador"
              descricao="Ative ou desative a proteção das próximas gerações"
            />
            <ItemNavegacao
              href="/mais/perfil"
              Icone={UserRound}
              rotulo="Dados de treino, saúde e rotina"
              descricao="Atualize as informações usadas pelo agent"
            />
          </ListaNavegacao>
        </section>

        <section aria-labelledby="mais-dados" className="flex flex-col gap-3">
          <CabecalhoSecao id="mais-dados" titulo="Privacidade e dados" />
          <ListaNavegacao>
            <ItemNavegacao
              href="/mais/consentimentos"
              Icone={ShieldCheck}
              rotulo="Consentimentos"
            />
            <ItemNavegacao
              href="/mais/sincronizacao"
              Icone={RefreshCw}
              rotulo="Sincronização"
            />
          </ListaNavegacao>
        </section>

        <section aria-labelledby="mais-conta" className="flex flex-col gap-3">
          <CabecalhoSecao id="mais-conta" titulo="Conta" />
          <ListaNavegacao>
            <ItemAcaoNavegacao acao={sair} Icone={LogOut} rotulo="Sair" />
            <ItemAcaoNavegacao
              acao={sairDeTodosDispositivos}
              Icone={MonitorOff}
              rotulo="Sair de todos os dispositivos"
              destrutivo
            />
          </ListaNavegacao>
        </section>
      </SecoesTela>
    </TelaConteudo>
  );
}
