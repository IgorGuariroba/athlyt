import { z } from "zod";
import type { DiaSemana, EtapaId, RespostasTriagem } from "./etapas";
import { isEquipamentoId } from "./equipamentos";

export type ResultadoParse =
  | { ok: true; dados: Partial<RespostasTriagem> }
  | { ok: false; erro: string };

const ORDEM_DIAS: readonly DiaSemana[] = [
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
  "domingo",
];

function ordenarDias(dias: DiaSemana[]): DiaSemana[] {
  return [...dias].sort(
    (a, b) => ORDEM_DIAS.indexOf(a) - ORDEM_DIAS.indexOf(b),
  );
}

/** `hoje` só existe como parâmetro para permitir relógio controlado em teste. */
function schemaIdade(hoje: Date) {
  return z.object({
    dataNascimento: z
      .string()
      .refine((valor) => !Number.isNaN(Date.parse(valor)), {
        message: "Data de nascimento inválida.",
      })
      .refine((valor) => new Date(valor).getTime() <= hoje.getTime(), {
        message: "Data de nascimento não pode ser no futuro.",
      }),
  });
}

const SCHEMAS: Record<EtapaId, (formData: FormData) => ResultadoParse> = {
  idade: (fd) => {
    const parsed = schemaIdade(new Date()).safeParse({
      dataNascimento: fd.get("dataNascimento"),
    });
    if (!parsed.success) {
      return { ok: false, erro: parsed.error.issues[0].message };
    }
    return { ok: true, dados: parsed.data };
  },
  sexo: (fd) => {
    const parsed = z
      .object({ sexoBiologico: z.enum(["masculino", "feminino"]) })
      .safeParse({ sexoBiologico: fd.get("sexoBiologico") });
    if (!parsed.success) {
      return { ok: false, erro: "Selecione o sexo biológico." };
    }
    return { ok: true, dados: parsed.data };
  },
  altura: (fd) => {
    const parsed = z
      .object({ alturaCm: z.coerce.number().min(100).max(250) })
      .safeParse({ alturaCm: fd.get("alturaCm") });
    if (!parsed.success) {
      return { ok: false, erro: "Informe uma altura válida em centímetros." };
    }
    return { ok: true, dados: parsed.data };
  },
  peso: (fd) => {
    const parsed = z
      .object({ pesoKg: z.coerce.number().min(30).max(300) })
      .safeParse({ pesoKg: fd.get("pesoKg") });
    if (!parsed.success) {
      return { ok: false, erro: "Informe um peso válido em quilogramas." };
    }
    return { ok: true, dados: parsed.data };
  },
  objetivo: (fd) => {
    const parsed = z
      .object({
        objetivoComposicao: z.enum([
          "recomposicao",
          "perder-gordura",
          "ganhar-massa",
        ]),
      })
      .safeParse({ objetivoComposicao: fd.get("objetivoComposicao") });
    if (!parsed.success) {
      return { ok: false, erro: "Selecione seu objetivo para continuar." };
    }
    return { ok: true, dados: parsed.data };
  },
  experiencia: (fd) => {
    const parsed = z
      .object({
        experienciaTreino: z.enum([
          "nunca-treinou",
          "iniciante",
          "intermediario",
          "avancado",
        ]),
      })
      .safeParse({ experienciaTreino: fd.get("experienciaTreino") });
    if (!parsed.success) {
      return { ok: false, erro: "Selecione sua experiência de treino." };
    }
    return { ok: true, dados: parsed.data };
  },
  disponibilidade: (fd) => {
    const parsed = z
      .object({
        diasDisponiveis: z
          .array(
            z.enum([
              "segunda",
              "terca",
              "quarta",
              "quinta",
              "sexta",
              "sabado",
              "domingo",
            ]),
          )
          .min(1),
      })
      .safeParse({ diasDisponiveis: fd.getAll("diasDisponiveis") });
    if (!parsed.success) {
      return {
        ok: false,
        erro: "Selecione ao menos um dia disponível para treinar.",
      };
    }
    return {
      ok: true,
      dados: { diasDisponiveis: ordenarDias(parsed.data.diasDisponiveis) },
    };
  },
  "duracao-sessao": (fd) => {
    const parsed = z
      .object({ duracaoSessaoMin: z.coerce.number().min(10).max(240) })
      .safeParse({ duracaoSessaoMin: fd.get("duracaoSessaoMin") });
    if (!parsed.success) {
      return { ok: false, erro: "Informe uma duração de sessão válida." };
    }
    return { ok: true, dados: parsed.data };
  },
  "academia-equipamentos": (fd) => {
    const parsed = z
      .object({
        localTreino: z.enum([
          "academia-completa",
          "condominio",
          "casa",
          "sem-equipamentos",
        ]),
        /**
         * Ids fora do catálogo são descartados em vez de rejeitados: a
         * lista chega do formulário e um id obsoleto (catálogo mudou
         * entre a montagem da página e o envio) não deve custar a
         * etapa inteira ao usuário. O que não existe simplesmente não
         * entra no perfil — e portanto não vira exercício prescrito.
         */
        equipamentos: z
          .array(z.string())
          .transform((ids) => ids.filter(isEquipamentoId)),
        equipamentosPersonalizados: z
          .array(z.string().trim().min(2).max(80))
          .max(20)
          .transform((nomes) => {
            const vistos = new Set<string>();
            return nomes.filter((nome) => {
              const chave = nome.toLocaleLowerCase("pt-BR");
              if (vistos.has(chave)) return false;
              vistos.add(chave);
              return true;
            });
          }),
      })
      .safeParse({
        localTreino: fd.get("localTreino"),
        equipamentos: fd.getAll("equipamentos"),
        equipamentosPersonalizados: fd.getAll(
          "equipamentosPersonalizados",
        ),
      });
    if (!parsed.success) {
      return { ok: false, erro: "Selecione onde você treina." };
    }
    return { ok: true, dados: parsed.data };
  },
  "saude-lesoes": (fd) => {
    const parsed = z
      .object({ lesoes: z.string() })
      .safeParse({ lesoes: fd.get("lesoes") ?? "" });
    if (!parsed.success) {
      return { ok: false, erro: "Não foi possível registrar lesões." };
    }
    return { ok: true, dados: parsed.data };
  },
  "saude-condicoes": (fd) => {
    const parsed = z
      .object({ condicoes: z.string() })
      .safeParse({ condicoes: fd.get("condicoes") ?? "" });
    if (!parsed.success) {
      return { ok: false, erro: "Não foi possível registrar condições." };
    }
    return { ok: true, dados: parsed.data };
  },
  "alimentacao-restricoes": (fd) => {
    const parsed = z
      .object({ restricoesAlimentares: z.array(z.string()) })
      .safeParse({ restricoesAlimentares: fd.getAll("restricoesAlimentares") });
    if (!parsed.success) {
      return { ok: false, erro: "Não foi possível registrar restrições." };
    }
    return { ok: true, dados: parsed.data };
  },
  "alimentacao-logistica": (fd) => {
    const parsed = z
      .object({
        orcamentoAlimentar: z.enum(["baixo", "medio", "alto"]),
        tempoPreparoMin: z.coerce.number().min(0).max(240),
      })
      .safeParse({
        orcamentoAlimentar: fd.get("orcamentoAlimentar"),
        tempoPreparoMin: fd.get("tempoPreparoMin"),
      });
    if (!parsed.success) {
      return { ok: false, erro: "Informe orçamento e tempo de preparo." };
    }
    return { ok: true, dados: parsed.data };
  },
  "rotina-sono": (fd) => {
    const parsed = z
      .object({
        nivelAtividade: z.enum([
          "sedentario",
          "leve",
          "moderado",
          "ativo",
          "muito-ativo",
        ]),
        horasSono: z.coerce.number().min(0).max(24),
      })
      .safeParse({
        nivelAtividade: fd.get("nivelAtividade"),
        horasSono: fd.get("horasSono"),
      });
    if (!parsed.success) {
      return { ok: false, erro: "Informe nível de atividade e horas de sono." };
    }
    return { ok: true, dados: parsed.data };
  },
};

/**
 * Valida o FormData de uma etapa da cascata e devolve o fragmento de
 * `RespostasTriagem` a mesclar no perfil, ou um erro legível para
 * exibir na própria tela (uma pergunta por tela — specs/workflow/
 * telas 005-023).
 */
export function parseRespostaEtapa(
  etapa: EtapaId,
  formData: FormData,
): ResultadoParse {
  return SCHEMAS[etapa](formData);
}
