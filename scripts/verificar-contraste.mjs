/**
 * Verifica o contraste dos temas claro e escuro (WCAG AA, texto normal: 4.5:1).
 *
 * Rode com `npm run check:contraste` sempre que mexer na paleta de
 * `src/app/globals.css`. Sai com código 1 se qualquer combinação de cor de
 * texto sobre superfície ficar abaixo do mínimo.
 *
 * A paleta é lida direto do CSS de propósito: valores duplicados aqui
 * envelheceriam sem ninguém notar, e o teste passaria medindo cores antigas.
 */
import { readFileSync } from "node:fs";
const css = readFileSync("src/app/globals.css", "utf8");

function bloco(seletor) {
  const i = css.indexOf(seletor);
  const corpo = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  const tokens = {};
  for (const m of corpo.matchAll(/--([\w-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();
  return tokens;
}
const parse = (v) => {
  if (v.startsWith("#")) { let h = v.slice(1); if (h.length === 3) h = [...h].map(c=>c+c).join("");
    return { rgb: [0,2,4].map(i=>parseInt(h.slice(i,i+2),16)), a: 1 }; }
  const n = v.match(/[\d.]+/g).map(Number);
  return { rgb: n.slice(0,3), a: n[3] ?? 1 };
};
const over = (fg, bg) => fg.rgb.map((c,i)=>Math.round(c*fg.a + bg.rgb[i]*(1-fg.a)));
const lum = (rgb) => { const s = rgb.map(v=>{ v/=255; return v<=0.03928? v/12.92 : ((v+0.055)/1.055)**2.4; });
  return 0.2126*s[0]+0.7152*s[1]+0.0722*s[2]; };
const ratio = (a,b) => { const [l1,l2]=[lum(a),lum(b)].sort((x,y)=>y-x); return (l1+0.05)/(l2+0.05); };

const temas = { CLARO: bloco(':root[data-theme="light"]'), ESCURO: bloco(":root,\n:root[data-theme=\"dark\"]") };
let falhas = 0;
for (const [nome, P] of Object.entries(temas)) {
  for (const sup of ["bg","surface","card"]) {
    const fundo = parse(P[sup]);
    // Todos estes tokens sao usados como cor de texto no app.
    for (const cor of ["text","muted","primary","income","expense","warn"]) {
      const r = ratio(over(parse(P[cor]), fundo), fundo.rgb);
      const ok = r >= 4.5;
      if (!ok) falhas++;
      console.log(`${ok?"PASSOU":"FALHOU"}  ${nome} ${cor.padEnd(8)} sobre ${sup.padEnd(8)} ${r.toFixed(2)}:1`);
    }
  }
}
console.log(falhas ? `\n${falhas} ABAIXO DE 4.5:1` : "\nTODOS >= 4.5:1 (AA para texto normal)");
process.exit(falhas ? 1 : 0);
