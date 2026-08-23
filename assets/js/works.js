/* ============================================================
   作品セクションのレンダラー
   window.DACO_WORKS のデータから #worksList に作品カードを描画する。
   ・メディアは YouTube / 動画ファイル(mp4など) / 画像ファイル(pngなど) に対応
   ・日本語/英語は DacoI18n.pick() で切り替え（英語が空なら日本語を表示）
   ・編集モード(edit.js)からは DacoWorks.render(下書きデータ) で再描画する
   ============================================================ */
(function () {
  'use strict';

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  const nl2br = (s) => esc(s).replace(/\r?\n/g, '<br>');

  const I18 = () => window.DacoI18n;
  const t = (k) => (I18() ? I18().t(k) : '');
  const pick = (o, f) => (I18() ? I18().pick(o, f) : (o && o[f]) || '');

  const PLAY_SVG =
    '<svg viewBox="0 0 68 48"><path d="M66.5 7.7c-.8-2.9-3-5.1-5.9-5.9C55.5.4 34 .4 34 .4s-21.5 0-26.6 1.4C4.6 2.6 2.3 4.9 1.5 7.7.1 12.8.1 24 .1 24s0 11.2 1.4 16.3c.8 2.9 3 5.1 5.9 5.9C12.5 47.6 34 47.6 34 47.6s21.5 0 26.6-1.4c2.9-.8 5.1-3 5.9-5.9C67.9 35.2 67.9 24 67.9 24s0-11.2-1.4-16.3z" fill="currentColor"/><path d="M45 24L27 14v20z" fill="#fff"/></svg>';

  const RE_VIDEO = /\.(mp4|webm|ogv|ogg|mov|m4v)(\?.*)?$/i;
  const RE_IMAGE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i;
  const RE_YT = /(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/;

  // 貼り付けられた文字列が YouTube / 動画ファイル / 画像ファイル のどれかを判定する
  function detectMedia(input) {
    const s = String(input || '').trim();
    if (!s) return null;
    const m = s.match(RE_YT);
    if (m) return { kind: 'youtube', id: m[1], src: '' };
    if (/^[A-Za-z0-9_-]{11}$/.test(s)) return { kind: 'youtube', id: s, src: '' };
    if (RE_VIDEO.test(s)) return { kind: 'video', id: '', src: s };
    if (/^data:video\//.test(s)) return { kind: 'video', id: '', src: s };
    if (RE_IMAGE.test(s) || /^data:image\//.test(s)) return { kind: 'image', id: '', src: s };
    return null;
  }

  // 旧形式(youtubeId 単体 / kind なし)も読めるように正規化する
  function normalizeItem(v) {
    if (!v) return null;
    if (v.kind === 'video' || v.kind === 'image' || v.kind === 'youtube') {
      if (v.kind === 'youtube' ? !v.id : !v.src) return null;
      return v;
    }
    if (v.id) return Object.assign({}, v, { kind: 'youtube' });
    if (v.src) {
      const d = detectMedia(v.src);
      return Object.assign({}, v, { kind: d ? d.kind : 'image' });
    }
    return null;
  }

  function mediaOf(w) {
    if (Array.isArray(w.videos) && w.videos.length) {
      return w.videos.map(normalizeItem).filter(Boolean);
    }
    if (w.youtubeId) {
      return [{ kind: 'youtube', id: w.youtubeId, src: '', label: '', thumb: w.thumb || '' }];
    }
    return [];
  }

  // 大きく表示するときのサムネイル
  function bigThumb(m, vertical) {
    if (m.thumb) return m.thumb;
    if (m.kind !== 'youtube' || !m.id) return '';
    return vertical
      ? `https://i.ytimg.com/vi/${m.id}/oardefault.jpg`
      : `https://i.ytimg.com/vi/${m.id}/maxresdefault.jpg`;
  }

  // 切り替えボタン用の小さいサムネ。maxres/oar は無い動画があるので必ず存在する hq を使う
  function smallThumb(m) {
    if (m.thumb) return m.thumb;
    if (m.kind === 'image') return m.src;
    if (m.kind === 'youtube' && m.id) return `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`;
    return '';
  }

  // YouTube プレイヤーの中身（サムネ＋再生ボタン）。切り替え時に main.js からも使う
  function facade(m, title, vertical) {
    const fb = m.id
      ? ` onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${esc(m.id)}/hqdefault.jpg'"`
      : '';
    return `<img src="${esc(bigThumb(m, vertical))}"${fb} alt="${esc(
      pick(m, 'label') || title
    )}" loading="lazy">
      <button class="yt__play" aria-label="${esc(t('work.play'))}">${PLAY_SVG}</button>
      ${vertical ? '<span class="yt__shorts-tag">Shorts</span>' : ''}`;
  }

  // メディア1件ぶんのプレイヤー要素（種類ごとに中身が変わる）
  function playerHTML(m, workTitle, vertical) {
    const label = esc(pick(m, 'label') || workTitle);
    const cls = ['yt', vertical ? 'yt--short' : '', m.kind !== 'youtube' ? 'yt--file' : '']
      .filter(Boolean)
      .join(' ');

    if (m.kind === 'video') {
      const poster = m.thumb ? ` poster="${esc(m.thumb)}"` : '';
      return `<div class="${cls}" data-kind="video">
        <video src="${esc(m.src)}"${poster} controls preload="metadata" playsinline title="${label}"></video>
      </div>`;
    }
    if (m.kind === 'image') {
      return `<div class="${cls}" data-kind="image">
        <a href="${esc(m.src)}" target="_blank" rel="noopener"><img src="${esc(
        m.src
      )}" alt="${label}" loading="lazy"></a>
      </div>`;
    }
    return `<div class="${cls}" data-kind="youtube" data-yt="${esc(
      m.id
    )}" data-title="${label}">${facade(m, workTitle, vertical)}</div>`;
  }

  function navItemHTML(m, i) {
    const label = pick(m, 'label') || t('work.video') + ' ' + (i + 1);
    const th = smallThumb(m);
    const icon = m.kind === 'video' ? '🎞' : m.kind === 'image' ? '🖼' : '▶';
    const inner = th
      ? `<img src="${esc(th)}" alt="" loading="lazy">`
      : `<span class="vidnav__ph">${icon}</span>`;
    return `<button class="vidnav__item${i === 0 ? ' is-active' : ''}" data-i="${i}" aria-label="${esc(
      label
    )}">
      <span class="vidnav__thumb">${inner}<span class="vidnav__no">${i + 1}</span></span>
      <span class="vidnav__label">${esc(label)}</span>
    </button>`;
  }

  function mediaHTML(w) {
    const title = pick(w, 'title');

    if (w.type === 'image') {
      const imgs = (w.images || []).filter((im) => im && im.src);
      if (!imgs.length) return '<div class="work__media"></div>';
      const thumbs = imgs
        .map(
          (im, i) =>
            `<button class="gallery__thumb${i === 0 ? ' is-active' : ''}" data-src="${esc(
              im.src
            )}" aria-label="${esc(
              pick(im, 'alt') || t('work.image') + ' ' + (i + 1)
            )}"><img src="${esc(im.src)}" alt="" loading="lazy"></button>`
        )
        .join('');
      return `<div class="work__media work__media--gallery">
        <figure class="gallery__main"><img src="${esc(imgs[0].src)}" alt="${esc(
        pick(imgs[0], 'alt') || title
      )}" loading="lazy"></figure>
        ${imgs.length > 1 ? `<div class="gallery__thumbs">${thumbs}</div>` : ''}
      </div>`;
    }

    const items = mediaOf(w);
    if (!items.length) return '<div class="work__media"></div>';
    const vert = !!w.vertical;
    const player = playerHTML(items[0], title, vert);

    if (items.length === 1) {
      return `<div class="work__media${vert ? ' work__media--vertical' : ''}">${player}</div>`;
    }

    const nav = items.map(navItemHTML).join('');
    return `<div class="work__media work__media--videos${
      vert ? ' work__media--vertical' : ''
    }" data-vertical="${vert ? '1' : ''}" data-worktitle="${esc(title)}">
      ${player}
      <div class="vidnav" role="group" aria-label="${esc(title + t('work.videoList'))}">${nav}</div>
    </div>`;
  }

  function workHTML(w, i) {
    const cls = [
      'work',
      'reveal',
      i % 2 === 1 ? 'work--rev' : '',
      w.type === 'image' ? 'work--gallery' : '',
    ]
      .filter(Boolean)
      .join(' ');

    const badges = (w.badges || [])
      .filter((b) => b && (b.text || b.textEn))
      .map(
        (b) =>
          `<span class="badge${b.style ? ' badge--' + esc(b.style) : ''}">${esc(
            pick(b, 'text')
          )}</span>`
      )
      .join('');

    const points = (w.points || [])
      .filter((p) => p && (p.label || p.text || p.labelEn || p.textEn))
      .map((p) => `<li><b>${esc(pick(p, 'label'))}</b>${nl2br(pick(p, 'text'))}</li>`)
      .join('');

    const no = t('work.no') + ' ' + String(i + 1).padStart(2, '0');
    const tools = pick(w, 'tools');
    const range = pick(w, 'range');
    const overview = pick(w, 'overview');

    return `<article class="${cls}" data-work-id="${esc(w.id)}">
      ${mediaHTML(w)}
      <div class="work__body">
        ${badges ? `<div class="work__badges">${badges}</div>` : ''}
        <h3 class="work__title"><span class="work__no">${no}</span>${esc(pick(w, 'title'))}</h3>
        ${overview ? `<p class="work__overview">${nl2br(overview)}</p>` : ''}
        ${points ? `<ul class="work__points">${points}</ul>` : ''}
        <div class="work__foot">
          ${tools ? `<p class="work__tools"><span>${esc(t('work.tools'))}</span>${esc(tools)}</p>` : ''}
          ${range ? `<p class="work__range"><span>${esc(t('work.range'))}</span>${esc(range)}</p>` : ''}
          ${
            w.linkUrl
              ? `<a class="work__link" href="${esc(
                  w.linkUrl
                )}" target="_blank" rel="noopener">${esc(
                  pick(w, 'linkLabel') || t('work.link')
                )} ↗</a>`
              : ''
          }
        </div>
      </div>
    </article>`;
  }

  let current = [];

  function render(works) {
    const list = document.getElementById('worksList');
    if (!list) return;
    if (Array.isArray(works)) current = works;
    const items = current.filter((w) => w && !w.hidden);
    list.innerHTML = items.map(workHTML).join('\n');
    // 再描画時は動画・ギャラリーの再バインドと表示アニメの再登録を行う
    if (window.DacoBind) window.DacoBind(list);
    if (window.DacoReveal) window.DacoReveal(list);
  }

  window.DacoWorks = {
    published: () => ((window.DACO_WORKS && window.DACO_WORKS.works) || []).slice(),
    current: () => current,
    render,
    workHTML,
    mediaOf,
    detectMedia,
    smallThumb,
    playerHTML,
    facade,
  };

  render(window.DacoWorks.published());

  // 言語が切り替わったら、同じデータのまま描き直す
  window.addEventListener('daco:langchange', () => {
    const wasVisible = !!document.querySelector('#worksList .work.is-visible');
    render();
    if (wasVisible) {
      document.querySelectorAll('#worksList .reveal').forEach((el) => el.classList.add('is-visible'));
    }
  });
})();
