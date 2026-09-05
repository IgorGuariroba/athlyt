import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTelaAtiva } from "@/lib/use-tela-ativa";

function Tela() {
  useTelaAtiva();
  return null;
}

function instalarWakeLock() {
  const release = vi.fn(() => Promise.resolve(undefined));
  const request = vi.fn(() => Promise.resolve({ release } as unknown as WakeLockSentinel));
  Object.defineProperty(navigator, "wakeLock", { value: { request }, configurable: true });
  return { request, release };
}

afterEach(() => {
  Reflect.deleteProperty(navigator, "wakeLock");
  vi.restoreAllMocks();
});

describe("useTelaAtiva", () => {
  it("mantém a tela acesa enquanto a sessão está aberta", async () => {
    const { request } = instalarWakeLock();

    render(<Tela />);
    await vi.waitFor(() => expect(request).toHaveBeenCalledWith("screen"));
  });

  it("devolve o bloqueio automático ao sair da sessão", async () => {
    const { release } = instalarWakeLock();

    const { unmount } = render(<Tela />);
    await vi.waitFor(() => expect(release).not.toHaveBeenCalled());
    unmount();

    await vi.waitFor(() => expect(release).toHaveBeenCalled());
  });

  it("readquire o bloqueio ao voltar para o app, que o navegador revoga sozinho", async () => {
    const { request } = instalarWakeLock();

    render(<Tela />);
    await vi.waitFor(() => expect(request).toHaveBeenCalled());
    const antes = request.mock.calls.length;

    document.dispatchEvent(new Event("visibilitychange"));
    await vi.waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(antes));
  });

  it("não quebra em navegador sem Wake Lock", () => {
    expect(() => render(<Tela />)).not.toThrow();
  });
});
