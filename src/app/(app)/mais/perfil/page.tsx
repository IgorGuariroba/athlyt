import { redirect } from "next/navigation";
import {
  CalendarDays,
  Dumbbell,
  HeartPulse,
  Utensils,
} from "lucide-react";

import { obterSessaoAtual } from "@/auth/sessao";
import {
  CabecalhoSecao,
  CabecalhoTela,
  ItemNavegacao,
  ListaNavegacao,
  NotaTela,
  SecoesTela,
  TelaConteudo,
} from "@/components/tela";
import type { EtapaId } from "@/domain/triagem/etapas";
import { obterPerfilVigente } from "@/domain/triagem/perfil";
import { montarResumoTriagem } from "@/domain/triagem/resumo";

const GRUPOS: readonly {
  id: string;
  titulo: string;
  Icone: typeof CalendarDays;
  etapas: readonly EtapaId[];
}[] = [
  {
    id: "dados-pessoais",
    titulo: "Dados pessoais",
    Icone: CalendarDays,
    etapas: ["idade", "sexo", "altura", "peso"],
  },
  {
    id: "perfil-treino",
    titulo: "Perfil de treino",
    Icone: Dumbbell,
    etapas: [
      "experiencia",
      "disponibilidade",
      "duracao-sessao",
      "academia-equipamentos",
    ],
  },
  {
    id: "saude",
    titulo: "Saúde",
    Icone: HeartPulse,
    etapas: ["saude-lesoes", "saude-condicoes"],
  },
  {
    id: "alimentacao-rotina",
    titulo: "Alimentação e rotina",
    Icone: Utensils,
    etapas: [
      "alimentacao-restricoes",
      "alimentacao-logistica",
      "rotina-sono",
    ],
  },
];

export default async function PerfilPersonalizacaoPage() {
  const session = await obterSessaoAtual();
  if (!session?.user?.id) redirect("/");

  const perfil = await obterPerfilVigente(session.user.id);
  const resumo = montarResumoTriagem(perfil?.respostas ?? {});
  const itens = new Map(resumo.itens.map((item) => [item.id, item]));

  return (
    <TelaConteudo>
      <CabecalhoTela
        contexto="Perfil e personalização"
        titulo="Seus dados"
        descricao="Mantenha atualizadas as informações que definem exercícios, volume, recuperação e estratégia alimentar."
        voltar={{ href: "/mais", rotulo: "Voltar para Mais" }}
      />

      <SecoesTela>
        {GRUPOS.map((grupo) => (
          <section
            key={grupo.id}
            aria-labelledby={grupo.id}
            className="flex flex-col gap-3"
          >
            <CabecalhoSecao id={grupo.id} titulo={grupo.titulo} />
            <ListaNavegacao>
              {grupo.etapas.map((etapaId) => {
                const item = itens.get(etapaId);
                if (!item) return null;
                return (
                  <ItemNavegacao
                    key={etapaId}
                    href={`/triagem/${etapaId}?retorno=/mais/perfil`}
                    Icone={grupo.Icone}
                    rotulo={item.titulo}
                    descricao={item.respondida ? "Atualizar resposta" : item.destrava}
                    valor={item.respondida ? "Pronto" : "Pendente"}
                  />
                );
              })}
            </ListaNavegacao>
          </section>
        ))}
      </SecoesTela>

      <NotaTela>
        Alterar o perfil não troca silenciosamente o Plano Ativo. Gere uma nova sugestão ou passe pela Revisão Semanal para aplicar mudanças estruturais.
      </NotaTela>
    </TelaConteudo>
  );
}
