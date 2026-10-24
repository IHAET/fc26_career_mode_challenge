/*
 * 🌐 Languages: swaps the interface's text (tabs, buttons, headings, labels,
 * placeholders and tooltips) into the chosen language as it appears on the
 * page, using the table in i18n-strings.js. Text that isn't in the table
 * (challenge rules, player names, posts) stays as it is.
 */
(function (root) {
  'use strict';
  const FC26 = (root.FC26 = root.FC26 || {});
  const KEY = 'fc26-lang-v1';
  const LANGS = [
    ['en', 'English'], ['es', 'Español'], ['pt', 'Português'], ['fr', 'Français'],
    ['de', 'Deutsch'], ['it', 'Italiano'], ['ro', 'Română'], ['zh', '中文'],
  ];
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE', 'PRE', 'svg', 'IFRAME']);

  const norm = (s) => s.replace(/\s+/g, ' ').trim();
  const tables = {};
  function table(lang) {
    if (tables[lang]) return tables[lang];
    const col = LANGS.findIndex((l) => l[0] === lang);
    const map = new Map();
    (FC26.i18nRows || []).forEach((row) => { if (row[col]) map.set(norm(row[0]), row[col]); });
    tables[lang] = map;
    return map;
  }

  /**
   * The text in `lang`, keeping what's around the words (emoji, numbers,
   * punctuation, spaces): "📒 Track it" → "📒 Seguirlo", "3 seasons" → "3 temporadas".
   */
  function translate(text, lang) {
    if (!text || !lang || lang === 'en') return text;
    const map = table(lang);
    const whole = map.get(norm(text));
    if (whole) {
      const m = text.match(/^(\s*)[\s\S]*?(\s*)$/);
      return m[1] + whole + m[2];
    }
    const m = text.match(/^([^\p{L}]*)([\s\S]*?\p{L})([^\p{L}]*)$/u);
    if (!m) return text;
    const core = map.get(norm(m[2]));
    return core ? m[1] + core + m[3] : text;
  }

  // ---------- The page ----------

  let lang = 'en';
  const texts = new WeakMap(); // text node → { src, out }
  const attrs = new WeakMap(); // element → { attr: { src, out } }
  let busy = false;

  function storageGet() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function storageSet(v) { try { localStorage.setItem(KEY, v); } catch (e) { /* private mode */ } }

  const skipped = (el) => !el || (el.closest && el.closest('[data-no-i18n], [contenteditable="true"]')) || SKIP.has(el.nodeName);

  function doText(node) {
    const parent = node.parentNode;
    if (!parent || skipped(parent) || (parent.closest && parent.closest('svg'))) return;
    const cur = node.nodeValue;
    const rec = texts.get(node);
    const src = rec && rec.out === cur ? rec.src : cur;
    if (!/\p{L}/u.test(src)) return;
    // An <option> without a value takes its text as the value: keep that in English.
    if (parent.nodeName === 'OPTION' && !parent.hasAttribute('value')) parent.setAttribute('value', norm(parent.textContent));
    const out = translate(src, lang);
    if (out !== cur) node.nodeValue = out;
    texts.set(node, { src, out });
  }

  function doAttrs(el) {
    if (skipped(el)) return;
    let rec = attrs.get(el);
    ATTRS.forEach((a) => {
      if (!el.hasAttribute(a)) return;
      const cur = el.getAttribute(a);
      const r = rec && rec[a];
      const src = r && r.out === cur ? r.src : cur;
      const out = translate(src, lang);
      if (out !== cur) el.setAttribute(a, out);
      if (!rec) { rec = {}; attrs.set(el, rec); }
      rec[a] = { src, out };
    });
  }

  function walk(rootNode) {
    if (!rootNode) return;
    if (rootNode.nodeType === 3) return doText(rootNode);
    if (rootNode.nodeType !== 1 || skipped(rootNode)) return;
    doAttrs(rootNode);
    rootNode.querySelectorAll('[placeholder], [title], [aria-label]').forEach(doAttrs);
    const it = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = it.nextNode())) doText(n);
  }

  function observe() {
    new MutationObserver((list) => {
      if (busy) return;
      busy = true;
      try {
        list.forEach((m) => {
          if (m.type === 'characterData') doText(m.target);
          else if (m.type === 'attributes') doAttrs(m.target);
          else m.addedNodes.forEach(walk);
        });
      } finally { busy = false; }
    }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // The 🌐 menus: the top bar's and the intro page's.
  const pickers = () => Array.from(document.querySelectorAll('#lang-select, [data-lang-select]'));

  function pickDefault() {
    const saved = storageGet();
    if (saved && LANGS.some((l) => l[0] === saved)) return saved;
    const nav = String((root.navigator && (navigator.languages || [])[0]) || (root.navigator && navigator.language) || '').slice(0, 2).toLowerCase();
    return LANGS.some((l) => l[0] === nav) ? nav : 'en';
  }

  /** Switch the page to `code` and remember it. */
  function set(code) {
    if (!LANGS.some((l) => l[0] === code)) code = 'en';
    lang = code;
    storageSet(code);
    document.documentElement.lang = code === 'zh' ? 'zh-Hans' : code;
    pickers().forEach((sel) => { sel.value = code; });
    busy = true;
    try { walk(document.body); } finally { busy = false; }
  }

  function init() {
    pickers().forEach((sel) => {
      sel.innerHTML = LANGS.map(([code, name]) => `<option value="${code}">${name}</option>`).join('');
      sel.addEventListener('change', () => set(sel.value));
    });
    set(pickDefault());
    observe();
  }

  FC26.i18n = { LANGS, translate, set, get: () => lang, init };
  if (typeof document !== 'undefined' && document.body) init();
})(typeof window !== 'undefined' ? window : globalThis);
