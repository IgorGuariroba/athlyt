import { describe, expect, it } from "vitest";
import { isEmailAllowed } from "../allowlist";

describe("isEmailAllowed", () => {
  it("permite um e-mail presente na allowlist", () => {
    expect(isEmailAllowed("igor@example.com", ["igor@example.com"])).toBe(
      true,
    );
  });

  it("nega um e-mail ausente da allowlist", () => {
    expect(isEmailAllowed("estranho@example.com", ["igor@example.com"])).toBe(
      false,
    );
  });

  it("ignora diferenças de maiúsculas/minúsculas", () => {
    expect(isEmailAllowed("Igor@Example.com", ["igor@example.com"])).toBe(
      true,
    );
  });

  it("ignora espaços acidentais nas duas pontas", () => {
    expect(isEmailAllowed(" igor@example.com ", ["igor@example.com"])).toBe(
      true,
    );
  });

  it("nega quando a allowlist está vazia", () => {
    expect(isEmailAllowed("igor@example.com", [])).toBe(false);
  });

  it("nega e-mail nulo ou ausente", () => {
    expect(isEmailAllowed(null, ["igor@example.com"])).toBe(false);
    expect(isEmailAllowed(undefined, ["igor@example.com"])).toBe(false);
  });

  it("nega string vazia mesmo que a allowlist tenha entradas", () => {
    expect(isEmailAllowed("", ["igor@example.com"])).toBe(false);
  });

  it("não confunde um e-mail com um sufixo de outro", () => {
    expect(
      isEmailAllowed("igor@example.com.br", ["igor@example.com"]),
    ).toBe(false);
  });
});
