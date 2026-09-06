import { describe, expect, it } from "vitest";
import { campoTexto, campoTextoOpcional, campoNumero } from "../form-data";

describe("form-data helpers", () => {
  it("extrai campo texto com valor padrão quando ausente ou não string", () => {
    const fd = new FormData();
    fd.set("nome", "Treino A");
    fd.set("arquivo", new File(["conteudo"], "foto.jpg"));

    expect(campoTexto(fd, "nome")).toBe("Treino A");
    expect(campoTexto(fd, "inexistente")).toBe("");
    expect(campoTexto(fd, "inexistente", "padrao")).toBe("padrao");
    expect(campoTexto(fd, "arquivo")).toBe("");
  });

  it("extrai campo texto opcional limpando espaços ou retornando null", () => {
    const fd = new FormData();
    fd.set("observacao", "  comentario  ");
    fd.set("vazio", "   ");

    expect(campoTextoOpcional(fd, "observacao")).toBe("comentario");
    expect(campoTextoOpcional(fd, "vazio")).toBeNull();
    expect(campoTextoOpcional(fd, "inexistente")).toBeNull();
  });

  it("extrai número com fallback quando inválido ou ausente", () => {
    const fd = new FormData();
    fd.set("carga", "42.5");
    fd.set("invalido", "abc");

    expect(campoNumero(fd, "carga")).toBe(42.5);
    expect(campoNumero(fd, "invalido", 10)).toBe(10);
    expect(campoNumero(fd, "inexistente", 0)).toBe(0);
  });
});
