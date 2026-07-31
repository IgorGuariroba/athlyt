import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const destino = join(process.cwd(), "public", "equipamentos");
await mkdir(destino, { recursive: true });

const linha = (conteudo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 112" role="img">
  <rect width="160" height="112" fill="#fff"/>
  <g fill="none" stroke="#111" stroke-width="5" stroke-linecap="round" stroke-linejoin="round">${conteudo}</g>
</svg>\n`;
const preenchido = (conteudo) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 112" role="img">
  <rect width="160" height="112" fill="#fff"/>
  <g fill="#111" stroke="#111" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${conteudo}</g>
</svg>\n`;

const miniaturas = {
  // Ilustração neutra para nomes livres: mantém a anatomia visual do
  // cartão sem fingir conhecer a aparência do equipamento informado.
  "personalizado": linha(`<path d="M28 58h70M39 47v22M48 42v32M78 47v22M87 42v32"/><circle cx="122" cy="42" r="20"/><path d="M122 32v20M112 42h20"/>`),
  "halteres": linha(`<path d="M39 42v28M48 36v40M112 36v40M121 42v28M48 56h64"/><path d="M31 47v18M129 47v18"/>`),
  "barra-olimpica": linha(`<path d="M18 56h124M34 44v24M42 40v32M118 40v32M126 44v24"/>`),
  "barra-w": linha(`<path d="M18 56h25l13-12 16 24 16-24 16 12h38M30 45v22M130 45v22"/>`),
  "anilhas": preenchido(`<ellipse cx="60" cy="58" rx="26" ry="35"/><ellipse cx="100" cy="54" rx="25" ry="34"/><ellipse cx="100" cy="54" rx="7" ry="10" fill="#fff"/><ellipse cx="60" cy="58" rx="7" ry="10" fill="#fff"/>`),
  "kettlebell": preenchido(`<path d="M61 42c0-24 38-24 38 0h-10c0-12-18-12-18 0z"/><path d="M53 50q27-17 54 0l7 42H46z"/>`),
  "banco-reto": linha(`<path d="M30 55h92v14H30zM42 69l-8 25M110 69l10 25"/>`),
  "banco-inclinado": linha(`<path d="M28 72h52v13H28zM80 72l28-43 12 8-28 42M42 85l-7 12M103 64l17 32"/>`),
  "rack-agachamento": linha(`<path d="M34 96V18M126 96V18M26 96h24M110 96h24M34 29h92M49 38h62M49 38v15M111 38v15"/>`),
  "barra-fixa": linha(`<path d="M33 96V25M127 96V25M33 25h94M23 96h20M117 96h20"/>`),
  "paralelas": linha(`<path d="M42 96V38h37M118 96V38H81M31 96h22M107 96h22"/>`),
  "leg-press": linha(`<path d="M35 93h90M48 93l20-48M68 45l37-20M97 21l19 36M55 65h43l18-8M48 76l-11-16M104 58v28"/>`),
  "cadeira-extensora": linha(`<path d="M40 36h42v12H40zM82 48v35M40 48v38M40 62h42M82 70h28M110 70v17M101 87h18M33 94h57"/>`),
  "mesa-flexora": linha(`<path d="M24 46h91v15H24zM36 61l-8 32M102 61l9 32M115 51h18v13h-18M133 57v29M124 86h18"/>`),
  "supino-maquina": linha(`<path d="M30 94V25M130 94V25M30 25h100M45 43h22M115 43H93M67 43v39M93 43v39M55 82h50M43 94h74"/>`),
  "voador": linha(`<path d="M48 94V35h64v59M48 35h64M67 48v34M93 48v34M67 58H35M93 58h32M35 48v20M125 48v20"/>`),
  "remada-maquina": linha(`<path d="M28 94h105M47 94V61h30v33M47 61h30M77 70l32-31M99 39h22M109 39v35M99 74h21"/>`),
  "panturrilha-maquina": linha(`<path d="M42 96V24h76v72M42 24h76M55 45h23M105 45H82M55 45v17M105 45v17M68 62v25M92 62v25M58 87h44"/>`),
  "hack-squat": linha(`<path d="M34 95h94M46 95l22-69M68 26h44M112 26l17 69M62 47h51M62 47l23 29M85 76h28M74 84h44"/>`),
  "smith": linha(`<path d="M34 96V18M126 96V18M26 96h24M110 96h24M47 30v58M113 30v58M47 51h66M40 51h80M57 88h46"/>`),
  "polia-alta": linha(`<path d="M35 96V18h90v78M35 18h90M50 32h60M80 32v17M80 49l-22 19M80 49l22 19M50 68h16M94 68h16M45 96h70"/><circle cx="80" cy="32" r="6"/>`),
  "polia-baixa": linha(`<path d="M35 96V18h90v78M35 18h90M50 81h60M80 81V65M80 65l-23-18M80 65l23-18M49 47h16M95 47h16M45 96h70"/><circle cx="80" cy="81" r="6"/>`),
  "crossover": linha(`<path d="M26 96V18h108v78M26 18h108M43 32v51M117 32v51M43 43l30 27M117 43L87 70M67 70h26M18 96h124"/><circle cx="43" cy="43" r="5"/><circle cx="117" cy="43" r="5"/>`),
  "elasticos": linha(`<path d="M42 30c-22 13-22 39 0 52M118 30c22 13 22 39 0 52M42 30l36 26-36 26M118 30L82 56l36 26"/><path d="M32 23l14 12M128 23l-14 12M32 89l14-12M128 89l-14-12"/>`),
  "trx": linha(`<path d="M80 15v23M63 15h34M80 38L48 83M80 38l32 45M40 82l14 10M120 82l-14 10"/><path d="M38 79l12-2 9 13-10 8zM122 79l-12-2-9 13 10 8z"/>`),
  "corda-naval": linha(`<path d="M18 83c14-40 27 40 41 0s27 40 41 0 27 40 42 0M18 76v16M142 76v16"/>`),
  "bola-suica": linha(`<circle cx="80" cy="58" r="39"/><path d="M43 54h74M47 40h66M47 72h66M55 87h50"/>`),
  "colchonete": preenchido(`<path d="M26 70l79-39 30 13-79 40z"/><path d="M26 70v10l30 13 79-40v-9L56 84z"/>`),
  "esteira": linha(`<path d="M32 81h86l17-14H52zM118 81l8 15M44 81l-9 15M125 67V25M125 25h20M125 42h-17M108 42l-11 25"/>`),
  "bicicleta": linha(`<circle cx="45" cy="78" r="24"/><circle cx="118" cy="78" r="24"/><path d="M45 78l24-35 18 35H45l31-23 42 23M69 43h20M87 78l9-44M88 34h17M69 43l-9-12M52 31h17"/>`),
  "eliptico": linha(`<path d="M32 91h96M80 91V49M80 49l-27 28M80 49l27 28M53 77l-16 14M107 77l16 14M80 49V22M80 22h23M62 36l18 13M98 36L80 49"/><circle cx="53" cy="77" r="6"/><circle cx="107" cy="77" r="6"/>`),
  "remo-ergometro": linha(`<path d="M22 87h116M38 87l39-42M77 45h28M105 45l19 42M58 65h47M105 65l-17-29M82 31h17M48 87l-8-15"/><circle cx="129" cy="87" r="7"/>`),
};

for (const [id, svg] of Object.entries(miniaturas)) {
  await writeFile(join(destino, `${id}.svg`), svg, "utf8");
}

console.log(`Geradas ${Object.keys(miniaturas).length} miniaturas em ${destino}`);
