/**
 * Código que roda **dentro** do navegador, via `page.evaluate`.
 *
 * Regra desta camada: coletar, nunca julgar. Nenhum limiar, nenhum
 * "conforme", nenhuma comparação com DESIGN.md — só o que o DOM diz.
 * Tudo que decide se algo é defeito mora em `checagens.ts` e
 * `verificacao.ts`, que são puros e testáveis sem Chromium.
 *
 * As funções são serializadas para o contexto da página, então não
 * podem fechar sobre nada do módulo: toda dependência entra por
 * argumento e todo helper é declarado dentro do corpo.
 */

/**
 * Elementos que interessam a uma observação.
 *
 * Não é o DOM inteiro: um inventário com 800 nós é tão inútil para o
 * agente quanto nenhum. O recorte é "o que o usuário pode acionar ou
 * ler como conteúdo próprio", que é também o que aparece na captura.
 */
export const SELETOR_DE_INTERESSE = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "[role=button]",
  "[role=link]",
  "[role=checkbox]",
  "[role=radio]",
  "[role=switch]",
  "[role=tab]",
  "[role=slider]",
  "[tabindex]:not([tabindex='-1'])",
  "h1",
  "h2",
  "h3",
  "[data-testid]",
].join(",");

/** Executado na página. Devolve `NoColetado[]` já em JSON puro. */
export const scriptInventario = /* js */ `
(seletor) => {
  const arredondar = (n) => Math.round(n * 10) / 10;

  const seletorDe = (el) => {
    if (!el) return "";
    if (el.dataset && el.dataset.testid) return "[data-testid='" + el.dataset.testid + "']";
    if (el.id) return el.tagName.toLowerCase() + "#" + el.id;
    const partes = [];
    let atual = el;
    while (atual && atual.nodeType === 1 && partes.length < 4) {
      let parte = atual.tagName.toLowerCase();
      if (atual.id) { partes.unshift(parte + "#" + atual.id); break; }
      const pai = atual.parentElement;
      if (pai) {
        const irmaos = Array.from(pai.children).filter((c) => c.tagName === atual.tagName);
        if (irmaos.length > 1) parte += ":nth-of-type(" + (irmaos.indexOf(atual) + 1) + ")";
      }
      partes.unshift(parte);
      atual = atual.parentElement;
    }
    return partes.join(" > ");
  };

  const nomeAcessivel = (el) => {
    const rotulo = el.getAttribute("aria-label");
    if (rotulo) return rotulo.trim();
    const refs = el.getAttribute("aria-labelledby");
    if (refs) {
      const texto = refs.split(/\\s+/)
        .map((id) => document.getElementById(id))
        .filter(Boolean)
        .map((n) => n.textContent || "")
        .join(" ")
        .trim();
      if (texto) return texto;
    }
    if (el.tagName === "INPUT" && el.labels && el.labels.length) {
      return (el.labels[0].textContent || "").trim();
    }
    return (el.textContent || "").trim().slice(0, 80);
  };

  const papelDe = (el) => {
    const explicito = el.getAttribute("role");
    if (explicito) return explicito;
    const tag = el.tagName.toLowerCase();
    if (tag === "a") return el.hasAttribute("href") ? "link" : "generic";
    if (tag === "button") return "button";
    if (tag === "input") return el.type === "checkbox" || el.type === "radio" ? el.type : "textbox";
    if (tag === "select") return "combobox";
    if (tag === "textarea") return "textbox";
    if (/^h[1-3]$/.test(tag)) return "heading";
    return "generic";
  };

  return Array.from(document.querySelectorAll(seletor)).map((el) => {
    const caixa = el.getBoundingClientRect();
    const estilo = getComputedStyle(el);
    return {
      papel: papelDe(el),
      nome: nomeAcessivel(el),
      tag: el.tagName.toLowerCase(),
      seletor: seletorDe(el),
      caixa: {
        x: arredondar(caixa.x),
        y: arredondar(caixa.y + window.scrollY),
        largura: arredondar(caixa.width),
        altura: arredondar(caixa.height),
      },
      estilo: {
        fontSize: estilo.fontSize,
        fontWeight: estilo.fontWeight,
        lineHeight: estilo.lineHeight,
        color: estilo.color,
        backgroundColor: estilo.backgroundColor,
        borderRadius: estilo.borderTopLeftRadius,
        paddingTop: estilo.paddingTop,
        paddingRight: estilo.paddingRight,
        paddingBottom: estilo.paddingBottom,
        paddingLeft: estilo.paddingLeft,
        outlineStyle: estilo.outlineStyle,
        outlineWidth: estilo.outlineWidth,
        boxShadow: estilo.boxShadow,
        zIndex: estilo.zIndex,
        position: estilo.position,
      },
      visivel:
        caixa.width > 0 &&
        caixa.height > 0 &&
        estilo.visibility !== "hidden" &&
        estilo.display !== "none" &&
        Number(estilo.opacity) > 0.01,
      desabilitado: el.disabled === true || el.getAttribute("aria-disabled") === "true",
      tabIndex: el.tabIndex,
      testid: el.dataset ? el.dataset.testid : undefined,
    };
  });
}
`;

/**
 * Cinco pontos por elemento: centro e quatro cantos recuados 2px.
 *
 * O canto exato pertence ao vizinho por arredondamento de subpixel, e
 * amostrar só o centro esconde a obstrução parcial — que é o caso real
 * do rodapé fixo cobrindo a borda de baixo de um CTA.
 */
export const scriptHitTest = /* js */ `
(seletor) => {
  const el = document.querySelector(seletor);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  const m = 2;
  const pontos = [
    [r.x + r.width / 2, r.y + r.height / 2],
    [r.x + m, r.y + m],
    [r.x + r.width - m, r.y + m],
    [r.x + m, r.y + r.height - m],
    [r.x + r.width - m, r.y + r.height - m],
  ];

  const caminho = (n) => {
    if (!n) return "(nenhum)";
    const partes = [];
    let atual = n;
    while (atual && atual.nodeType === 1 && partes.length < 4) {
      let p = atual.tagName.toLowerCase();
      if (atual.id) { partes.unshift(p + "#" + atual.id); break; }
      partes.unshift(p);
      atual = atual.parentElement;
    }
    return partes.join(" > ");
  };

  return pontos.map(([x, y]) => ({
    ponto: [Math.round(x), Math.round(y)],
    atingido: caminho(document.elementFromPoint(x, y)),
    ehProprio: (() => {
      const alvo = document.elementFromPoint(x, y);
      return Boolean(alvo && (alvo === el || el.contains(alvo)));
    })(),
  }));
}
`;

/** Estilo de foco antes e depois de `.focus()`, para `avaliarFoco`. */
export const scriptFoco = /* js */ `
(seletor) => {
  const el = document.querySelector(seletor);
  if (!el) return null;
  const ler = () => {
    const s = getComputedStyle(el);
    return {
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      boxShadow: s.boxShadow,
    };
  };
  const antes = ler();
  const focavel = typeof el.focus === "function" && el.tabIndex > -1;
  if (focavel) el.focus();
  const depois = ler();
  if (focavel) el.blur();
  return { focavel, antes, depois };
}
`;

/**
 * Deslocamentos de layout observados desde o carregamento.
 *
 * O observer é instalado antes da navegação (`addInitScript`), porque
 * `PerformanceObserver` registrado depois perde os shifts iniciais —
 * justamente os que importam, os do carregamento de imagem e fonte.
 */
export const scriptObservadorDeShift = /* js */ `
() => {
  window.__uiForenseShifts = [];
  try {
    new PerformanceObserver((lista) => {
      for (const entrada of lista.getEntries()) {
        if (entrada.hadRecentInput) continue;
        window.__uiForenseShifts.push({
          valor: entrada.value,
          instante: Math.round(entrada.startTime),
          fontes: (entrada.sources || []).map((f) => ({
            no: f.node && f.node.tagName ? f.node.tagName.toLowerCase() : "(desconhecido)",
            de: [Math.round(f.previousRect.x), Math.round(f.previousRect.y)],
            para: [Math.round(f.currentRect.x), Math.round(f.currentRect.y)],
          })),
        });
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
}
`;

export const scriptLerShifts = /* js */ `() => window.__uiForenseShifts || []`;
