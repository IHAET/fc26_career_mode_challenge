#!/usr/bin/env node
/*
 * Bundle the app into one self-contained HTML file (CSS and JS inlined) at
 * dist/fc26-challenge-builder.html, so it can be opened or shared as a
 * single file. Run with `npm run build`.
 */
'use strict';
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'dist', 'fc26-challenge-builder.html');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let html = read('index.html');

html = html.replace(/<link rel="stylesheet" href="([^"]+)">/g, (_, href) => `<style>\n${read(href)}</style>`);

html = html.replace(/<script src="([^"]+)"><\/script>/g, (_, src) => {
  const js = read(src);
  if (/<\/script/i.test(js)) throw new Error(`${src} contains "</script", which would break inlining`);
  return `<script>/* ${src} */\n${js}</script>`;
});

const leftovers = html.match(/<(script|link)[^>]+(src|href)="(?!data:)[^"]+"/g);
if (leftovers) throw new Error(`Unbundled references left: ${leftovers.join(', ')}`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`Wrote ${path.relative(ROOT, OUT)} (${(Buffer.byteLength(html) / 1024).toFixed(0)} KB)`);
