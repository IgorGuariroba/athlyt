"use client";

const ICONE_NOTIFICACAO = "/icons/icon-192.png";
const BADGE_NOTIFICACAO = "/icons/icon-96.png";

/**
 * A API de Badging só está disponível para PWA instalada em alguns
 * navegadores. O restante do treino não depende dela: o timer e a
 * notificação continuam funcionando quando o método não existe.
 */
export async function marcarDescansoPronto(): Promise<void> {
  if (typeof navigator === "undefined" || typeof navigator.setAppBadge !== "function") return;
  try {
    await navigator.setAppBadge(1);
  } catch {
    // Badge é uma melhoria progressiva e pode ser recusado pelo SO.
  }
}

export async function limparBadgeTreino(): Promise<void> {
  if (typeof navigator === "undefined" || typeof navigator.clearAppBadge !== "function") return;
  try {
    await navigator.clearAppBadge();
  } catch {
    // Badge é uma melhoria progressiva e pode ser recusado pelo SO.
  }
}

export async function solicitarPermissaoNotificacoes(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  return Notification.permission === "granted";
}

/**
 * Mostra a notificação pelo service worker quando ele está disponível.
 * Isso permite que o navegador trate a notificação como uma notificação
 * nativa da PWA; em desenvolvimento ou sem SW, usa o fallback da página.
 */
export async function notificarDescansoConcluido(): Promise<void> {
  if (!(await solicitarPermissaoNotificacoes())) return;

  const opcoes: NotificationOptions = {
    body: "Sua próxima série está pronta.",
    icon: ICONE_NOTIFICACAO,
    badge: BADGE_NOTIFICACAO,
    tag: "athlyt-descanso-concluido",
    data: { url: "/inicio" },
  };

  try {
    if ("serviceWorker" in navigator) {
      const registro = await navigator.serviceWorker.ready;
      await registro.showNotification("Descanso concluído", opcoes);
      return;
    }
  } catch {
    // O SW pode ainda estar instalando ou indisponível nesta sessão.
  }

  new Notification("Descanso concluído", opcoes);
}

/**
 * Permite ao service worker remover o badge quando o atleta abre a
 * notificação. É seguro chamar mesmo quando nenhum SW está registrado.
 */
export function ouvirMensagensDoServiceWorker(): () => void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return () => undefined;

  const aoReceberMensagem = (evento: MessageEvent) => {
    if (evento.data?.tipo === "athlyt:limpar-badge") void limparBadgeTreino();
  };
  navigator.serviceWorker.addEventListener("message", aoReceberMensagem);
  return () => navigator.serviceWorker.removeEventListener("message", aoReceberMensagem);
}
