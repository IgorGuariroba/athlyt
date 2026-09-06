import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { atualizarEstadoRevisaoCorporal, garantirPesoInicial, listarFotosExpiradas, obterOuCriarAvaliacaoInicial, obterPanoramaCorporal, obterPesoEMetaAtuais, obterSerieDePeso, recalcularMetasProporcao, registrarAvaliacaoVisual, registrarCircunferencia, registrarFotoProgresso, registrarGorduraCorporal, registrarPeso, registrarPesoEMeta, registrarRevisaoCorporal, revogarAvaliacoesVisuais, salvarCircunferenciaDaAvaliacaoInicial } from "../repositorio";
import { produzirRevisaoCorporal } from "../revisao-corporal";

async function usuario() { const [u] = await db.insert(users).values({ email: `medicoes-${randomUUID()}@example.com` }).returning(); return u!.id; }
describe("jornada persistida de medições", () => {
  it("preserva leituras, método de gordura e metas versionadas", async () => {
    const userId = await usuario();
    await registrarPeso(userId, 82.4);
    // Caminho real do produto: `fita-v2` usa uma leitura por região.
    const medicao = await registrarCircunferencia(userId, { regiao: "ombros", leiturasCm: [116.2] });
    expect(medicao.ok).toBe(true);
    await registrarGorduraCorporal(userId, { percentual: 18.2, metodo: "bioimpedancia", protocolo: "jejum" });
    await recalcularMetasProporcao(userId, ["ombros"]);
    const panorama = await obterPanoramaCorporal(userId);
    expect(panorama.pesos[0]!.pesoGramas).toBe(82400);
    expect(panorama.gorduras[0]).toMatchObject({ percentualBasisPoints: 1820, metodo: "bioimpedancia" });
    expect(panorama.metas[0]).toMatchObject({ regiao: "ombros", direcao: "aumentar", metodologiaVersao: "trajetoria-v1" });
    // A medida guarda o protocolo sob o qual foi coletada, para que
    // registros de `fita-v1` não sejam reinterpretados depois.
    expect(panorama.medicoes[0]).toMatchObject({ valorMm: 1162, qualidade: "moderada" });
  });

  it("insere cada pesagem e preserva o histórico de metas", async () => {
    const userId = await usuario();
    const primeiro = await registrarPesoEMeta(userId, { pesoAtualKg: 82.4, pesoMetaKg: 76 });
    const segundo = await registrarPesoEMeta(userId, { pesoAtualKg: 81.9, pesoMetaKg: 75 });

    expect(segundo.meta!.id).not.toBe(primeiro.meta!.id);
    expect(await obterPesoEMetaAtuais(userId)).toEqual({ pesoAtualKg: 81.9, pesoMetaKg: 75 });
    const panorama = await obterPanoramaCorporal(userId);
    expect(panorama.pesos.map((peso) => peso.pesoGramas)).toEqual([81900, 82400]);
  });

  it("não versiona a meta quando ela não mudou", async () => {
    const userId = await usuario();
    const primeiro = await registrarPesoEMeta(userId, { pesoAtualKg: 82.4, pesoMetaKg: 76 });
    const repetido = await registrarPesoEMeta(userId, { pesoAtualKg: 81.9, pesoMetaKg: 76 });

    // A pesagem é sempre um fato novo; reenviar a mesma meta não é
    // uma decisão de mudar de alvo.
    expect(repetido.medicao!.id).not.toBe(primeiro.medicao!.id);
    expect(repetido.meta!.id).toBe(primeiro.meta!.id);
  });

  it("cria a linha de base do gráfico uma única vez, mesmo reenviando a triagem", async () => {
    const userId = await usuario();
    const inicial = await garantirPesoInicial(userId, 90);
    const reenvio = await garantirPesoInicial(userId, 88);

    expect(reenvio!.id).toBe(inicial!.id);
    const serie = await obterSerieDePeso(userId);
    expect(serie.medicoes.map(({ pesoKg }) => pesoKg)).toEqual([90]);
  });

  it("entrega a série em ordem cronológica com a meta vigente", async () => {
    const userId = await usuario();
    await garantirPesoInicial(userId, 90);
    await registrarPesoEMeta(userId, { pesoAtualKg: 88, pesoMetaKg: 80 });
    await registrarPesoEMeta(userId, { pesoAtualKg: 86.5, pesoMetaKg: 78 });

    const serie = await obterSerieDePeso(userId);
    expect(serie.medicoes.map(({ pesoKg }) => pesoKg)).toEqual([90, 88, 86.5]);
    expect(serie.pesoMetaKg).toBe(78);
  });

  it("atualiza a mesma região da avaliação inicial sem criar falsa evolução", async () => {
    const userId = await usuario();
    const avaliacao = await obterOuCriarAvaliacaoInicial(userId);

    const primeira = await salvarCircunferenciaDaAvaliacaoInicial(userId, {
      assessmentId: avaliacao.id,
      regiao: "cintura",
      leiturasCm: [84],
    });
    const corrigida = await salvarCircunferenciaDaAvaliacaoInicial(userId, {
      assessmentId: avaliacao.id,
      regiao: "cintura",
      leiturasCm: [85.5],
    });

    expect(primeira.ok).toBe(true);
    expect(corrigida.ok).toBe(true);
    if (!primeira.ok || !corrigida.ok) return;
    expect(corrigida.medicao!.id).toBe(primeira.medicao!.id);
    expect(corrigida.medicao!.valorMm).toBe(855);
  });

  it("versiona projeção visual e o estado da Revisão Semanal", async () => {
    const userId = await usuario();
    const visual = await registrarAvaliacaoVisual(userId, { photoIds: [randomUUID()], criterios: { vTaper: 70, ombros: 68, cintura: 62, equilibrio: 66, simetria: 64 }, gorduraMinBasisPoints: 1200, gorduraMaxBasisPoints: 1600, observacoes: ["comparável"], limitacoes: [], confianca: "alta", metodologiaVersao: "visual-v1", modeloResolvido: "modelo-teste" });
    expect(visual!.ativa).toBe(true);
    const revisao = produzirRevisaoCorporal({ dimensoes: { aderencia: 80, desempenho: 70, tendenciaCorporal: 60, recuperacao: 70, utilidade: 80 }, confiancas: { composicaoCorporal: "confiavel", proporcoes: "confiavel", simetriaBilateral: "confiavel", treinamento: "confiavel", nutricao: "confiavel", saudeRecuperacao: "confiavel" }, evidencias: [], semanasObservadas: 2 });
    const linha = await registrarRevisaoCorporal(userId, { periodoInicio: new Date("2026-07-01T00:00:00Z"), periodoFim: new Date("2026-07-07T23:59:59Z"), revisao });
    expect((await atualizarEstadoRevisaoCorporal(userId, linha.id, "aplicada"))?.estado).toBe("aplicada");
    await revogarAvaliacoesVisuais(userId);
    const panorama = await obterPanoramaCorporal(userId);
    expect(panorama.avaliacoesVisuais[0]!.ativa).toBe(false);
    expect(panorama.revisoes[0]!.estado).toBe("aplicada");
  });

  it("seleciona para retenção somente fotos cujo prazo venceu", async () => {
    const userId = await usuario();
    const vencida = await registrarFotoProgresso(userId, { pose: "frente", objectKey: `teste/${randomUUID()}.webp`, excluirEm: new Date("2020-01-01T00:00:00Z") });
    await registrarFotoProgresso(userId, { pose: "costas", objectKey: `teste/${randomUUID()}.webp`, excluirEm: new Date("2090-01-01T00:00:00Z") });
    const expiradas = await listarFotosExpiradas(new Date("2026-01-01T00:00:00Z"));
    expect(expiradas.some((foto) => foto.id === vencida!.id)).toBe(true);
    expect(expiradas.filter((foto) => foto.userId === userId)).toHaveLength(1);
  });
});
