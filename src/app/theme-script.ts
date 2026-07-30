import { THEME_STORAGE_KEY } from "@/lib/theme";

/**
 * Script síncrono injetado no <head>, antes da primeira pintura.
 *
 * O store de tema só roda depois da hidratação do React — tarde demais: quem
 * escolheu o tema claro veria um flash escuro em cada carregamento. Este script
 * lê a preferência e aplica `data-theme` imediatamente. O store depois confirma
 * o mesmo valor, então não há troca visível.
 *
 * Mantido minúsculo e à prova de falha de propósito: qualquer erro cai no
 * escuro, que é o tema padrão do app.
 */
export const themeInitScript = `
(function(){
  try {
    var stored = localStorage.getItem('${THEME_STORAGE_KEY}');
    var mode = (stored === 'light' || stored === 'dark') ? stored : 'auto';
    var theme = mode === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : mode;
    document.documentElement.dataset.theme = theme;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;
