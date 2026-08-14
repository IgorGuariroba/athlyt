import { describe, expect, it } from "vitest";
import { classificarConsentimentos } from "../consentimento";

const recorte = {
  versao: 4,
  campos: [
    { id: "triagem-completa" },
    { id: "fotos-corporais" },
    { id: "linha-base-corporal" },
  ],
};

describe("classificarConsentimentos", () => {
  it("considera vigente apenas o consentimento dado na versão atual do recorte", () => {
    const estado = classificarConsentimentos(
      [
        { campo: "triagem-completa", recorteVersao: 4 },
        { campo: "linha-base-corporal", recorteVersao: 4 },
      ],
      recorte,
    );

    expect(estado.vigentes).toEqual(["triagem-completa", "linha-base-corporal"]);
    expect(estado.ausentes).toEqual(["fotos-corporais"]);
    expect(estado.precisaReconsentir).toBe(false);
  });

  /**
   * O bug que motivou esta separação: o recorte subiu de 2 para 4 e o
   * consentimento antigo passou a ser tratado como inexistente, gerando
   * plano sem medições nem metas sem nenhum sinal ao usuário.
   */
  it("distingue consentimento defasado de consentimento nunca dado", () => {
    const estado = classificarConsentimentos(
      [
        { campo: "triagem-completa", recorteVersao: 2 },
        { campo: "linha-base-corporal", recorteVersao: 2 },
      ],
      recorte,
    );

    expect(estado.vigentes).toEqual([]);
    expect(estado.defasados).toEqual([
      { campo: "triagem-completa", recorteVersao: 2 },
      { campo: "linha-base-corporal", recorteVersao: 2 },
    ]);
    expect(estado.ausentes).toEqual(["fotos-corporais"]);
    expect(estado.precisaReconsentir).toBe(true);
  });

  it("não pede reconsentimento quando o usuário nunca consentiu nada", () => {
    const estado = classificarConsentimentos([], recorte);

    expect(estado.precisaReconsentir).toBe(false);
    expect(estado.ausentes).toHaveLength(3);
  });

  it("mantém a versão mais alta quando há consentimentos defasados repetidos", () => {
    const estado = classificarConsentimentos(
      [
        { campo: "triagem-completa", recorteVersao: 1 },
        { campo: "triagem-completa", recorteVersao: 3 },
      ],
      recorte,
    );

    expect(estado.defasados).toEqual([
      { campo: "triagem-completa", recorteVersao: 3 },
    ]);
  });

  it("ignora campo consentido que não é mais declarado pelo recorte", () => {
    const estado = classificarConsentimentos(
      [{ campo: "campo-removido", recorteVersao: 4 }],
      recorte,
    );

    expect(estado.vigentes).toEqual([]);
    expect(estado.defasados).toEqual([]);
    expect(estado.ausentes).toEqual([
      "triagem-completa",
      "fotos-corporais",
      "linha-base-corporal",
    ]);
  });
});
