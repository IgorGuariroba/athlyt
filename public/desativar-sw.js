/*
 * Acelera a retirada do Serwist de quem já abriu o novo app. Não registra
 * worker para novos visitantes nem interfere em registros de outros scripts.
 * Se estiver sem rede, a próxima visita tenta novamente; nunca recarregamos
 * uma aba em que o atleta possa estar preenchendo dados.
 */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(async (registrations) => {
    const scriptUrl = new URL("/sw.js", location.origin).href;
    const scope = new URL("/", location.origin).href;
    await Promise.all(registrations
      .filter((registration) => registration.scope === scope &&
        [registration.active, registration.waiting, registration.installing]
          .some((worker) => worker?.scriptURL === scriptUrl))
      .map((registration) => registration.update()));
  }).catch((error) => {
    console.warn("Não foi possível atualizar o worker antigo; nova tentativa na próxima visita.", error);
  });
}
