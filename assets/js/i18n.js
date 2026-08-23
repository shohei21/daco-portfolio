/* ============================================================
   言語切り替え（日本語 / English）
   ・data-i18n="キー"           … その要素の中身を差し替える
   ・data-i18n-attr="属性名"    … 中身ではなく属性を差し替える
   ・記憶: localStorage / URLの ?lang=en / ブラウザ設定 の順で決定
   ============================================================ */
(function () {
  'use strict';

  const DICT = window.DACO_I18N || { ja: {}, en: {} };
  const KEY = 'daco.lang';
  const LANGS = ['ja', 'en'];

  function detect() {
    try {
      const saved = localStorage.getItem(KEY);
      if (LANGS.indexOf(saved) >= 0) return saved;
    } catch (e) {}
    const q = new URLSearchParams(location.search).get('lang');
    if (LANGS.indexOf(q) >= 0) return q;
    const nav = (navigator.language || 'ja').toLowerCase();
    return nav.indexOf('ja') === 0 ? 'ja' : 'en';
  }

  let lang = detect();

  function t(key, fallbackLang) {
    const d = DICT[fallbackLang || lang] || {};
    if (key in d) return d[key];
    const ja = DICT.ja || {};
    return key in ja ? ja[key] : '';
  }

  function apply(root) {
    (root || document).querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (val === '') return;
      const attr = el.dataset.i18nAttr;
      if (attr) el.setAttribute(attr, val.replace(/<[^>]*>/g, ''));
      else el.innerHTML = val;
    });
  }

  function set(next, opts) {
    if (LANGS.indexOf(next) < 0) return;
    lang = next;
    try { localStorage.setItem(KEY, lang); } catch (e) {}
    document.documentElement.lang = lang;
    document.title = t('meta.title').replace(/<[^>]*>/g, '');
    apply();
    syncButtons();
    // 作品カードは動的に描画しているので、言語が変わったら描き直す
    if (!(opts && opts.silent) && window.DacoWorks) {
      window.dispatchEvent(new CustomEvent('daco:langchange', { detail: { lang } }));
    }
  }

  function syncButtons() {
    document.querySelectorAll('#langSwitch [data-lang]').forEach((b) => {
      const on = b.dataset.lang === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  window.DacoI18n = {
    get lang() { return lang; },
    set,
    t,
    apply,
    // 作品データから、今の言語に合った値を取り出す（英語が空なら日本語にフォールバック）
    pick(obj, field) {
      if (!obj) return '';
      if (lang === 'en') {
        const en = obj[field + 'En'];
        if (en != null && String(en).trim() !== '') return en;
      }
      return obj[field] == null ? '' : obj[field];
    }
  };

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('#langSwitch [data-lang]');
    if (btn) set(btn.dataset.lang);
  });

  // 初期適用（works.js より前に読み込まれるので、作品カードはこの時点では未描画）
  document.documentElement.lang = lang;
  document.title = t('meta.title').replace(/<[^>]*>/g, '');
  apply();
  syncButtons();
})();
