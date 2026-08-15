import { createServer } from "node:http";

const porta = Number(process.env.IA_E2E_PORT ?? 4311);

const server = createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end("ok");
    return;
  }
  if (req.method !== "POST" || !req.url?.endsWith("/chat/completions")) {
    res.writeHead(404).end();
    return;
  }

  let corpo = "";
  req.on("data", (parte) => { corpo += parte; });
  req.on("end", () => {
    if (/cargaKg[^\d]{0,20}13/.test(corpo)) {
      res.writeHead(503, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: { message: "provedor indisponível no cenário E2E" } }));
      return;
    }
    const conteudo = JSON.stringify({
      cargaSugeridaKg: 26,
      repeticoesAlvo: 9,
      rirAlvo: 2,
      descansoSegundos: null,
      justificativa: "A série registrada ficou no alvo; avance sem alterar o exercício.",
      alertaCautela: null,
    });
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "chatcmpl-athlyt-e2e",
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: "athlyt-copiloto-e2e-v1",
      choices: [{ index: 0, message: { role: "assistant", content: conteudo }, finish_reason: "stop" }],
      usage: { prompt_tokens: Math.ceil(corpo.length / 4), completion_tokens: 40, total_tokens: Math.ceil(corpo.length / 4) + 40 },
    }));
  });
});

server.listen(porta, "127.0.0.1", () => {
  console.log(`Servidor IA E2E em http://127.0.0.1:${porta}`);
});
