// Gera public/sitemap.xml com alternates hreflang por idioma (?lng=xx), para
// indexação multi-país. Rode: node scripts/gen-sitemap.mjs
import { writeFileSync } from 'node:fs';

const BASE = 'https://www.jonasgoat.com';
const LANGS = ['pt', 'en', 'zh', 'hi', 'es', 'fr', 'ar', 'bn', 'ru', 'id', 'de', 'ja', 'ko', 'it', 'tr', 'vi', 'pl', 'uk', 'nl', 'th'];
const HREFLANG = { pt: 'pt-BR' }; // demais idiomas usam o próprio código
const hl = (c) => HREFLANG[c] || c;

// Rotas públicas indexáveis (sem admin/login/bankroll etc.).
const ROUTES = [
  ['/', '1.0'],
  ['/precos', '0.9'],
  ['/founders', '0.9'],
  ['/predictions', '0.8'],
  ['/comparador', '0.8'],
  ['/copa-2026', '0.8'],
  ['/metodologia', '0.6'],
  ['/transparencia', '0.6'],
  ['/atualizacoes', '0.5'],
  ['/termos', '0.3'],
];

let urls = '';
for (const [path, priority] of ROUTES) {
  const loc = BASE + path;
  const alts = LANGS
    .map((c) => `    <xhtml:link rel="alternate" hreflang="${hl(c)}" href="${loc}?lng=${c}"/>`)
    .join('\n');
  urls += `  <url>\n    <loc>${loc}</loc>\n${alts}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>\n    <priority>${priority}</priority>\n  </url>\n`;
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}</urlset>\n`;
writeFileSync(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log(`sitemap.xml gerado: ${ROUTES.length} rotas x ${LANGS.length} idiomas`);
