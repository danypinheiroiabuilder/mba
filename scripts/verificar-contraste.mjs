/**
 * Verifica o contraste dos temas claro e escuro (WCAG AA, texto normal: 4.5:1).
 *
 * Rode com `npm run check:contraste` sempre que mexer na paleta de
 * `src/app/globals.css`. Sai com código 1 se qualquer cor de texto ficar abaixo
 * do mínimo sobre alguma superfície onde ela realmente aparece.
 *
 * Duas decisões que fazem este script valer algo:
 *
 * 1. A paleta é lida direto do CSS. Valores duplicados aqui envelheceriam sem
 *    ninguém notar, e o teste passaria medindo cores antigas.
 *
 * 2. As superfícies são compostas como o app pinta de verdade. Os painéis são
 *    translúcidos (`bg-surface/55`, `bg-card/45`), então o fundo atravessa e o
 *    contraste real não é o do token puro. Medir `--card` sozinho daria um
 *    número que não existe em nenhum pixel da tela.
 */
import { readFileSync } from "node:fs";

// Normaliza CRLF: no Windows o git reescreve o arquivo com \r\n no checkout, e
// seletores casados com \n deixariam de ser encontrados — o script passou a
// falhar sozinho depois de um merge, sem ninguém ter mexido no CSS.
const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");

function bloco(seletor) {
  const i = css.indexOf(seletor);
  if (i === -1) throw new Error(`Bloco não encontrado no globals.css: ${seletor}`);
  const corpo = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  const tokens = {};
  for (const m of corpo.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}

const parse = (v) => {
  if (v.startsWith("#")) {
    let h = v.slice(1);
    if (h.length === 3) h = [...h].map((c) => c + c).join("");
    return { rgb: [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)), a: 1 };
  }
  const n = v.match(/[\d.]+/g).map(Number);
  return { rgb: n.slice(0, 3), a: n[3] ?? 1 };
};

/** Achata uma cor com transparência sobre um fundo opaco. */
const over = (fg, bgRgb) => fg.rgb.map((c, i) => Math.round(c * fg.a + bgRgb[i] * (1 - fg.a)));

const lum = (rgb) => {
  const s = rgb.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * s[0] + 0.7152 * s[1] + 0.0722 * s[2];
};

const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const MINIMO = 4.5;

const temas = {
  CLARO: bloco(':root[data-theme="light"]'),
  ESCURO: bloco(':root,\n:root[data-theme="dark"]'),
};

let falhas = 0;

for (const [tema, P] of Object.entries(temas)) {
  const bg = parse(P.bg).rgb;

  // Empilhamento real das superfícies. Os tokens --panel e --card-fill já
  // carregam a transparência de cada tema, então basta achatá-los sobre o que
  // está atrás. O login não fica dentro de painel: o Card dele assenta direto
  // no fundo da página, e é a superfície mais exigente do app.
  const painel = over(parse(P.panel), bg);
  const cartao = over(parse(P["card-fill"]), painel);
  const cartaoNoLogin = over(parse(P["card-fill"]), bg);
  // Campos e caixas informativas: bg-card/40 e bg-card/30 sobre o cartão.
  const campo = over({ ...parse(P.card), a: 0.4 }, cartao);
  const caixaInfo = over({ ...parse(P.card), a: 0.3 }, cartaoNoLogin);
  // Barra inferior do celular (bg-panel-raised sobre o fundo da página) e a
  // pílula da aba ativa (bg-card por cima da barra). O rótulo tem 11px, então
  // conta como texto normal e vale o mesmo mínimo de 4.5:1 — não é texto
  // grande. Mesma superfície do cartão de sessão na sidebar do desktop.
  const barraMobile = over(parse(P["panel-raised"]), bg);
  const abaAtiva = over(parse(P.card), barraMobile);

  const todas = ["text", "muted", "primary", "income", "expense", "warn"];

  const superficies = {
    // No fundo cru só aparece o título do cabeçalho mobile.
    "fundo da pagina": { rgb: bg, cores: ["text", "muted"] },
    painel: { rgb: painel, cores: todas },
    cartao: { rgb: cartao, cores: todas },
    "cartao no login": { rgb: cartaoNoLogin, cores: todas },
    "campo de form": { rgb: campo, cores: ["text", "muted"] },
    "caixa informativa": { rgb: caixaInfo, cores: ["muted"] },
    // Aba inativa usa `muted`; `text` é o estado de hover/foco.
    "barra mobile": { rgb: barraMobile, cores: ["text", "muted"] },
    "aba ativa": { rgb: abaAtiva, cores: ["text"] },
  };

  for (const [nome, { rgb, cores }] of Object.entries(superficies)) {
    for (const cor of cores) {
      const r = ratio(over(parse(P[cor]), rgb), rgb);
      const ok = r >= MINIMO;
      if (!ok) falhas++;
      console.log(
        `${ok ? "PASSOU" : "FALHOU"}  ${tema.padEnd(6)} ${cor.padEnd(8)} sobre ${nome.padEnd(17)} ${r.toFixed(2)}:1`,
      );
    }
  }
}

console.log(
  falhas ? `\n${falhas} ABAIXO DE ${MINIMO}:1` : `\nTODOS >= ${MINIMO}:1 (AA para texto normal)`,
);
process.exit(falhas ? 1 : 0);
