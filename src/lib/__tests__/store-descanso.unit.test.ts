import { afterEach, describe, expect, it, vi } from "vitest";

import {
  assinarDescanso,
  definirRitmoDescanso,
  lerDescanso,
  lerDescansoServidor,
  reiniciarDescanso,
} from "../store-descanso";

afterEach(() => {
  reiniciarDescanso();
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("store de ritmo de descanso", () => {
  it("guarda a escolha por exercício e sobrevive a uma nova leitura", () => {
    definirRitmoDescanso("supino", "longo");
    definirRitmoDescanso("elevacao-lateral", "curto");
    reiniciarDescanso();

    expect(lerDescanso()).toEqual({ supino: "longo", "elevacao-lateral": "curto" });
  });

  it("mantém o snapshot estável entre notificações", () => {
    definirRitmoDescanso("supino", "curto");

    expect(lerDescanso()).toBe(lerDescanso());
  });

  it("notifica os assinantes apenas quando o valor muda", () => {
    const aoMudar = vi.fn();
    const cancelar = assinarDescanso(aoMudar);

    definirRitmoDescanso("supino", "longo");
    definirRitmoDescanso("supino", "longo");

    expect(aoMudar).toHaveBeenCalledTimes(1);
    cancelar();
  });

  it("descarta valor corrompido no armazenamento em vez de derrubar a tela", () => {
    window.localStorage.setItem("athlyt:ritmo-descanso", '{"supino":"turbo","agachamento":"curto"}');
    reiniciarDescanso();

    expect(lerDescanso()).toEqual({ agachamento: "curto" });
  });

  it("sobrevive a um localStorage indisponível", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    reiniciarDescanso();

    expect(lerDescanso()).toEqual({});
  });

  it("não presume preferência alguma na SSR", () => {
    definirRitmoDescanso("supino", "longo");

    expect(lerDescansoServidor()).toEqual({});
  });
});
