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
    // Transcrição do áudio da refeição: reconhecida pelo campo
    // `trechosIncertos` do schema, que nenhuma outra operação pede.
    if (/trechosIncertos/.test(corpo)) {
      responder(res, "athlyt-refeicao-audio-e2e-v1", {
        transcricao: "Duas colheres de arroz, um bife médio e um copo de suco.",
        trechosIncertos: ["um copo de suco"],
      });
      return;
    }

    // Recálculo de um item corrigido na revisão: reconhecido pelo campo
    // `alimento-corrigido` do Recorte, que só esta operação envia.
    // Responde como a versão zero do refrigerante, que é o caso que
    // motivou a operação: mesmo nome, composição inteiramente outra.
    if (/alimento-corrigido/.test(corpo)) {
      responder(res, "athlyt-alimento-macros-e2e-v1", {
        calorias: 0, proteinaG: 0, carboidratosG: 0, gordurasG: 0, fibrasG: 0,
        confianca: "alta",
      });
      return;
    }

    // Estimativa por descrição: distinguida da foto por `porcaoDescrita`,
    // que só o schema de `refeicao-texto` declara.
    if (/porcaoDescrita/.test(corpo)) {
      responder(res, "athlyt-refeicao-texto-e2e-v1", {
        nome: "Almoço: arroz, bife e suco",
        itens: [
          { descricao: "Arroz branco cozido", porcaoDescrita: "duas colheres", quantidade: 100, unidade: "g", calorias: 128, proteinaG: 2, carboidratosG: 28, gordurasG: 0, fibrasG: 1, confianca: "media" },
          { descricao: "Bife de alcatra grelhado", porcaoDescrita: "um bife médio", quantidade: 120, unidade: "g", calorias: 250, proteinaG: 32, carboidratosG: 0, gordurasG: 13, fibrasG: 0, confianca: "media" },
          { descricao: "Suco de laranja", porcaoDescrita: "um copo", quantidade: 200, unidade: "ml", calorias: 90, proteinaG: 1, carboidratosG: 21, gordurasG: 0, fibrasG: 0, confianca: "baixa" },
        ],
        limitacoes: ["A quantidade de arroz foi assumida como porção usual"],
        confianca: "media",
      });
      return;
    }

    // Estimativa de refeição por foto: reconhecida pela instrução de
    // sistema da operação, e não pela imagem — o corpo carrega a foto
    // em base64 e casar contra ela seria frágil.
    if (/quantidade|refeição.*foto|refeicao.*foto|refeicao-foto|image_url|data:image|mediaType|type["']?:["']file/i.test(corpo) || !/cargaKg/.test(corpo)) {
      const pedido = JSON.parse(corpo) as { model?: string; provider?: { only?: string[] } };
      // O cenário padrão esgota o primário para exercitar o fallback real da aplicação.
      if (pedido.provider?.only?.includes("google-vertex/eu")) {
        res.writeHead(429, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: { message: "rate limit sintético" } }));
        return;
      }
      // A Coca-Cola entra em ml e sem o "Zero": é o caso real — a foto
      // mostra a garrafa, o modelo não lê o rótulo, e só quem bebeu
      // sabe qual era. É o que o E2E exercita na revisão.
      const refeicao = JSON.stringify({
        nome: "Almoço: arroz, feijão e frango",
        itens: [
          { descricao: "Arroz branco cozido", quantidade: 150, unidade: "g", calorias: 192, proteinaG: 3, carboidratosG: 42, gordurasG: 0, fibrasG: 2, confianca: "media" },
          { descricao: "Feijão carioca cozido", quantidade: 80, unidade: "g", calorias: 61, proteinaG: 4, carboidratosG: 11, gordurasG: 1, fibrasG: 6, confianca: "media" },
          { descricao: "Peito de frango grelhado", quantidade: 120, unidade: "g", calorias: 191, proteinaG: 38, carboidratosG: 0, gordurasG: 4, fibrasG: 0, confianca: "alta" },
          { descricao: "Óleo de preparo", quantidade: 5, unidade: "g", calorias: 44, proteinaG: 0, carboidratosG: 0, gordurasG: 5, fibrasG: 0, confianca: "baixa" },
          { descricao: "Coca-Cola", quantidade: 250, unidade: "ml", calorias: 105, proteinaG: 0, carboidratosG: 26, gordurasG: 0, fibrasG: 0, confianca: "media" },
        ],
        limitacoes: ["O óleo do preparo não é visível na foto", "O rótulo da bebida não está legível na foto"],
        confianca: "media",
      });
      setTimeout(() => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({
          id: "chatcmpl-athlyt-e2e-foto",
          object: "chat.completion",
          created: Math.floor(Date.now() / 1000),
          model: pedido.model ?? "athlyt-refeicao-foto-e2e-v1",
          choices: [{ index: 0, message: { role: "assistant", content: refeicao }, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 80, total_tokens: 180 },
        }));
      }, 500);
      return;
    }

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

function responder(
  res: import("node:http").ServerResponse,
  modelo: string,
  conteudo: unknown,
) {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    id: `chatcmpl-${modelo}`,
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: modelo,
    choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(conteudo) }, finish_reason: "stop" }],
    usage: { prompt_tokens: 100, completion_tokens: 80, total_tokens: 180 },
  }));
}

server.listen(porta, "127.0.0.1", () => {
  console.log(`Servidor IA E2E em http://127.0.0.1:${porta}`);
});
