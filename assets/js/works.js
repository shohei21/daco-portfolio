/* ============================================================
   作品セクションのレンダラー
   window.DACO_WORKS のデータから #worksList に作品カードを描画する。
   編集モード(edit.js)からは DacoWorks.render(下書きデータ) で再描画する。
   ============================================================ */
(function () {
  'use strict';

  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
    );
  const nl2br = (s) => esc(s).replace(/\r?\n/g, '<br>');

  const PLAY_SVG =
    '<svg viewBox="0 0 68 48"><path d="M66.5 7.7c-.8-2.9-3-5.1-5.9-5.9C55.5.4 34 .4 34 .4s-21.5 0-26.6 1.4C4.6 2.6 2.3 4.9 1.5 7.7.1 12.8.1 24 .1 24s0 11.2 1.4 16.3c.8 2.9 3 5.1 5.9 5.9C12.5 47.6 34 47.6 34 47.6s21.5 0 26.6-1.4c2.9-.8 5.1-3 5.9-5.9C67.9 35.2 67.9 24 67.9 24s0-11.2-1.4-16.3z" fill="currentColor"/><path d="M45 24L27 14v20z" fill="#fff"/></svg>';

  // 旧形式(youtubeId 単体)も読めるように正規化する
  function videosOf(w) {
    if (Array.isArray(w.videos) && w.videos.length) return w.videos.filter((v) => v && v.id);
    if (w.youtubeId) return [{ id: w.youtubeId, label: '', thumb: w.thumb || '' }];
    return [];
  }

  // 切り替えボタン用の小さいサムネ。maxres/oar は無い動画があるので必ず存在する hq を使う
  function ytThumbSmall(v) {
    if (v.thumb) return v.thumb;
    return v.id ? `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` : '';
  }

  function ytThumb(v, vertical) {
    if (v.thumb) return v.thumb;
    if (!v.id) return '';
    return vertical
      ? `https://i.ytimg.com/vi/${v.id}/oardefault.jpg`
      : `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`;
  }

  // プレイヤーの中身（サムネ＋再生ボタン）。動画切り替え時に main.js からも使う
  function facade(v, title, vertical) {
    const fb = v.id
      ? ` onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${esc(v.id)}/hqdefault.jpg'"`
      : '';
    return `<img src="${esc(ytThumb(v, vertical))}"${fb} alt="${esc(v.label || title)} サムネイル" loading="lazy">
      <button class="yt__play" aria-label="動画を再生">${PLAY_SVG}</button>
      ${vertical ? '<span class="yt__shorts-tag">Shorts</span>' : ''}`;
  }

  function mediaHTML(w) {
    if (w.type === 'image') {
      const imgs = (w.images || []).filter((im) => im && im.src);
      if (!imgs.length) return '<div class="work__media"></div>';
      const thumbs = imgs
        .map(
          (im, i) =>
            `<button class="gallery__thumb${i === 0 ? ' is-active' : ''}" data-src="${esc(
              im.src
            )}" aria-label="${esc(im.alt || '画像' + (i + 1))}"><img src="${esc(
              im.src
            )}" alt="" loading="lazy"></button>`
        )
        .join('');
      return `<div class="work__media work__media--gallery">
        <figure class="gallery__main"><img src="${esc(imgs[0].src)}" alt="${esc(
        imgs[0].alt || w.title
      )}" loading="lazy"></figure>
        ${imgs.length > 1 ? `<div class="gallery__thumbs">${thumbs}</div>` : ''}
      </div>`;
    }

    const vids = videosOf(w);
    if (!vids.length) return '<div class="work__media"></div>';
    const vert = !!w.vertical;
    const first = vids[0];

    const player = `<div class="yt${vert ? ' yt--short' : ''}" data-yt="${esc(
      first.id
    )}" data-title="${esc(first.label || w.title)}">${facade(first, w.title, vert)}</div>`;

    if (vids.length === 1) {
      return `<div class="work__media${vert ? ' work__media--vertical' : ''}">${player}</div>`;
    }

    const nav = vids
      .map(
        (v, i) =>
          `<button class="vidnav__item${i === 0 ? ' is-active' : ''}" data-i="${i}" data-yt="${esc(
            v.id
          )}" data-thumb="${esc(v.thumb || '')}" data-label="${esc(v.label || '')}" aria-label="${esc(
            v.label || '動画 ' + (i + 1)
          )}を表示">
            <span class="vidnav__thumb"><img src="${esc(
              ytThumbSmall(v)
            )}" alt="" loading="lazy"><span class="vidnav__no">${i + 1}</span></span>
            <span class="vidnav__label">${esc(v.label || '動画 ' + (i + 1))}</span>
          </button>`
      )
      .join('');

    return `<div class="work__media work__media--videos${vert ? ' work__media--vertical' : ''}" data-vertical="${
      vert ? '1' : ''
    }" data-worktitle="${esc(w.title)}">
      ${player}
      <div class="vidnav" role="group" aria-label="${esc(w.title)}の動画一覧">${nav}</div>
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
      .filter((b) => b && b.text)
      .map(
        (b) =>
          `<span class="badge${b.style ? ' badge--' + esc(b.style) : ''}">${esc(b.text)}</span>`
      )
      .join('');

    const points = (w.points || [])
      .filter((p) => p && (p.label || p.text))
      .map((p) => `<li><b>${esc(p.label)}</b>${nl2br(p.text)}</li>`)
      .join('');

    const no = 'WORK ' + String(i + 1).padStart(2, '0');

    return `<article class="${cls}" data-work-id="${esc(w.id)}">
      ${mediaHTML(w)}
      <div class="work__body">
        ${badges ? `<div class="work__badges">${badges}</div>` : ''}
        <h3 class="work__title"><span class="work__no">${no}</span>${esc(w.title)}</h3>
        ${w.overview ? `<p class="work__overview">${nl2br(w.overview)}</p>` : ''}
        ${points ? `<ul class="work__points">${points}</ul>` : ''}
        <div class="work__foot">
          ${w.tools ? `<p class="work__tools"><span>Tools</span>${esc(w.tools)}</p>` : ''}
          ${w.range ? `<p class="work__range"><span>担当範囲</span>${esc(w.range)}</p>` : ''}
          ${
            w.linkUrl
              ? `<a class="work__link" href="${esc(
                  w.linkUrl
                )}" target="_blank" rel="noopener">${esc(w.linkLabel || 'リンクを見る')} ↗</a>`
              : ''
          }
        </div>
      </div>
    </article>`;
  }

  function render(works) {
    const list = document.getElementById('worksList');
    if (!list) return;
    const items = (Array.isArray(works) ? works : []).filter((w) => w && !w.hidden);
    list.innerHTML = items.map(workHTML).join('\n');
    // 再描画時は動画・ギャラリーの再バインドと表示アニメの再登録を行う
    if (window.DacoBind) window.DacoBind(list);
    if (window.DacoReveal) window.DacoReveal(list);
  }

  window.DacoWorks = {
    published: () => ((window.DACO_WORKS && window.DACO_WORKS.works) || []).slice(),
    render,
    workHTML,
    videosOf,
    ytThumb,
    ytThumbSmall,
    facade,
  };

  render(window.DacoWorks.published());
})();
