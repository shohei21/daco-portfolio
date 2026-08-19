/* ============================================================
   DACO PORTFOLIO — 編集モード
   ------------------------------------------------------------
   ・開き方（隠しトリガー）
       1) フッターの「DACO.」の "." を 3回続けてクリック（スマホは長押し1秒）
       2) キーボード Ctrl + Shift + E
       3) URL の末尾に #edit を付けて開く
   ・パスワードは SHA-256 ハッシュ照合（平文はどこにも保存されません）
   ・編集内容はまずブラウザに下書き保存 → 「公開」でGitHubへコミット
   ============================================================ */
(function () {
  'use strict';

  const CFG = window.DACO_EDIT_CONFIG || {};
  const PATHS = Object.assign(
    { works: 'assets/data/works.js', config: 'assets/js/edit-config.js', imageDir: 'assets/img/uploads' },
    CFG.paths || {}
  );
  const LS = {
    draft: 'daco.edit.draft',
    pass: 'daco.edit.passhash',
    gh: 'daco.edit.gh',
    token: 'daco.edit.token'
  };

  /* ---------------- SHA-256（file:// でも動くよう自前実装） --------------- */
  function rotr(x, n) { return ((x >>> n) | (x << (32 - n))) >>> 0; }
  function sha256Hex(str) {
    const K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    let H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    const msg = new TextEncoder().encode(str);
    const len = msg.length;
    const pad = (56 - ((len + 1) % 64) + 64) % 64;
    const total = len + 1 + pad + 8;
    const buf = new Uint8Array(total);
    buf.set(msg);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor((len * 8) / 4294967296));
    dv.setUint32(total - 4, (len * 8) >>> 0);
    const w = new Uint32Array(64);
    for (let i = 0; i < total; i += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(i + t * 4);
      for (let t = 16; t < 64; t++) {
        const s0 = rotr(w[t-15],7) ^ rotr(w[t-15],18) ^ (w[t-15] >>> 3);
        const s1 = rotr(w[t-2],17) ^ rotr(w[t-2],19) ^ (w[t-2] >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
      }
      let a=H[0],b=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (let t = 0; t < 64; t++) {
        const S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        const S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) >>> 0;
        h=g; g=f; f=e; e=(d+t1)>>>0; d=c; c=b; b=a; a=(t1+t2)>>>0;
      }
      H = [(H[0]+a)>>>0,(H[1]+b)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,(H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
    }
    return H.map((x) => x.toString(16).padStart(8, '0')).join('');
  }

  /* ---------------------------- 小物ユーティリティ ---------------------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const esc = (s) =>
    String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
    );
  const uid = () => 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function b64utf8(str) {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    const CH = 0x8000;
    for (let i = 0; i < bytes.length; i += CH) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CH));
    }
    return btoa(bin);
  }
  function parseYouTube(v) {
    v = String(v || '').trim();
    if (!v) return '';
    const m = v.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
    if (/^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    return '';
  }
  function bytesOfDataUrl(u) {
    const i = String(u).indexOf(',');
    return i < 0 ? 0 : Math.floor(((u.length - i - 1) * 3) / 4);
  }
  const fmtSize = (n) => (n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.round(n / 1024) + ' KB');

  /* --------------------------------- 状態 --------------------------------- */
  let works = null;        // 編集中データ
  let unlocked = false;
  let ui = null;           // DOM参照まとめ

  const published = () => ((window.DACO_WORKS && window.DACO_WORKS.works) || []);

  function loadDraft() {
    try {
      const raw = localStorage.getItem(LS.draft);
      if (!raw) return null;
      const d = JSON.parse(raw);
      return Array.isArray(d && d.works) ? d.works : null;
    } catch (e) { return null; }
  }
  function saveDraft() {
    try {
      localStorage.setItem(LS.draft, JSON.stringify({ savedAt: Date.now(), works }));
    } catch (e) {
      toast('下書きの保存に失敗しました（画像が大きすぎる可能性があります）', true);
    }
  }
  function hasDraft() { return JSON.stringify(works) !== JSON.stringify(published()); }

  function getGh() {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(LS.gh) || '{}'); } catch (e) {}
    return Object.assign({ owner: '', repo: '', branch: 'main' }, CFG.github || {}, saved);
  }
  function setGh(v) { localStorage.setItem(LS.gh, JSON.stringify(v)); }
  function getToken() {
    return sessionStorage.getItem(LS.token) || localStorage.getItem(LS.token) || '';
  }
  function setToken(t, remember) {
    sessionStorage.removeItem(LS.token);
    localStorage.removeItem(LS.token);
    if (!t) return;
    (remember ? localStorage : sessionStorage).setItem(LS.token, t);
  }

  /* ------------------------------ 隠しトリガー ------------------------------ */
  function installTriggers() {
    const dot = document.getElementById('dot');
    if (dot) {
      let clicks = 0, timer = null, press = null;
      dot.style.cursor = 'default';
      dot.addEventListener('click', () => {
        clicks++;
        clearTimeout(timer);
        timer = setTimeout(() => { clicks = 0; }, 1200);
        if (clicks >= 3) { clicks = 0; openGate(); }
      });
      // スマホ用：1秒長押し
      dot.addEventListener('touchstart', () => { press = setTimeout(openGate, 1000); }, { passive: true });
      ['touchend', 'touchmove', 'touchcancel'].forEach((ev) =>
        dot.addEventListener(ev, () => clearTimeout(press), { passive: true })
      );
    }
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        e.preventDefault();
        openGate();
      }
      if (e.key === 'Escape' && ui && ui.root.classList.contains('is-open')) {
        // フォームが開いていればフォームだけ閉じる
        if (ui.modal.classList.contains('is-open')) closeForm();
      }
    });
    if (location.hash === '#edit') setTimeout(openGate, 300);
  }

  /* -------------------------------- ゲート -------------------------------- */
  const isLocal = () =>
    location.protocol === 'file:' ||
    /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function openGate() {
    if (unlocked) { openPanel(); return; }
    buildUI();
    const first = !(CFG.passHash || localStorage.getItem(LS.pass));
    // パスワード未設定の状態で公開サイトから誰でも設定できてしまわないよう、
    // 初回セットアップはローカル（file:// または localhost）でのみ受け付ける
    const blocked = first && !isLocal();
    const mode = blocked ? 'blocked' : first ? 'setup' : 'login';
    ui.gate.classList.add('is-open');
    ui.gate.dataset.mode = mode;
    $('.dedit-gate__lock', ui.gate).textContent = blocked ? '🚧' : '🔒';
    $('.dedit-gate__title', ui.gate).textContent =
      blocked ? '編集モードは未設定です' : first ? '初回セットアップ' : '編集モード';
    $('.dedit-gate__desc', ui.gate).innerHTML = blocked
      ? 'パスワードがまだ設定されていません。<br>手元のPCで <code>index.html</code> を開き、そこで初回セットアップを行ってください。'
      : first
      ? 'このサイトの編集用パスワードを決めてください。<br>平文は保存されず、ハッシュだけが使われます。'
      : 'パスワードを入力してください。';
    ui.gatePw.hidden = blocked;
    $('.dedit-gate__confirm', ui.gate).hidden = !first || blocked;
    $('[data-act=gate-ok]', ui.gate).hidden = blocked;
    $('[data-act=gate-cancel]', ui.gate).textContent = blocked ? '閉じる' : 'キャンセル';
    $('.dedit-gate__err', ui.gate).textContent = '';
    ui.gatePw.value = '';
    ui.gatePw2.value = '';
    if (!blocked) setTimeout(() => ui.gatePw.focus(), 60);
  }
  function closeGate() { if (ui) ui.gate.classList.remove('is-open'); }

  function submitGate() {
    const err = $('.dedit-gate__err', ui.gate);
    if (ui.gate.dataset.mode === 'blocked') return;
    const pw = ui.gatePw.value;
    if (!pw) { err.textContent = 'パスワードを入力してください'; return; }
    if (ui.gate.dataset.mode === 'setup') {
      if (pw.length < 6) { err.textContent = '6文字以上にしてください'; return; }
      if (pw !== ui.gatePw2.value) { err.textContent = '確認用パスワードが一致しません'; return; }
      localStorage.setItem(LS.pass, sha256Hex(pw));
      unlock();
      toast('パスワードを設定しました。「設定」タブから確定・公開してください');
      return;
    }
    const hash = sha256Hex(pw);
    const ok = hash === CFG.passHash || hash === localStorage.getItem(LS.pass);
    if (!ok) { err.textContent = 'パスワードが違います'; ui.gatePw.select(); return; }
    unlock();
  }

  function unlock() {
    unlocked = true;
    closeGate();
    works = loadDraft() || clone(published());
    openPanel();
    renderList();
    applyPreview();
  }

  /* -------------------------------- プレビュー ------------------------------- */
  function applyPreview() {
    window.DacoWorks.render(works);
    const list = document.getElementById('worksList');
    if (list) $$('.reveal', list).forEach((e) => e.classList.add('is-visible'));
    updateDirty();
  }
  function updateDirty() {
    if (!ui) return;
    const dirty = hasDraft();
    ui.root.classList.toggle('is-dirty', dirty);
    ui.banner.hidden = !dirty;
    $('.dedit-badge', ui.drawer).textContent = dirty ? '未公開の変更あり' : '公開中と同じ';
    $('.dedit-badge', ui.drawer).classList.toggle('is-warn', dirty);
    const pub = $('#deditPublishBtn');
    if (pub) pub.disabled = !dirty;
  }

  /* ------------------------------- UI 構築 -------------------------------- */
  function buildUI() {
    if (ui) return;
    const root = el('<div class="dedit-root" id="deditRoot"></div>');

    /* --- ゲート --- */
    const gate = el(`
      <div class="dedit-gate">
        <div class="dedit-gate__box">
          <div class="dedit-gate__lock">🔒</div>
          <h2 class="dedit-gate__title">編集モード</h2>
          <p class="dedit-gate__desc">パスワードを入力してください。</p>
          <input type="password" class="dedit-in dedit-gate__pw" placeholder="パスワード" autocomplete="current-password">
          <input type="password" class="dedit-in dedit-gate__confirm" placeholder="パスワード（確認用）" autocomplete="new-password" hidden>
          <p class="dedit-gate__err"></p>
          <div class="dedit-gate__btns">
            <button class="dedit-btn dedit-btn--ghost" data-act="gate-cancel">キャンセル</button>
            <button class="dedit-btn dedit-btn--primary" data-act="gate-ok">開く</button>
          </div>
        </div>
      </div>`);

    /* --- バナー --- */
    const banner = el(
      '<div class="dedit-banner" hidden>下書きをプレビュー中（まだ公開されていません）<button class="dedit-banner__btn" data-act="open-panel">編集パネルを開く</button></div>'
    );

    /* --- ドロワー --- */
    const drawer = el(`
      <aside class="dedit-drawer" aria-label="編集パネル">
        <header class="dedit-drawer__head">
          <div>
            <h2 class="dedit-drawer__title">✏️ 編集モード</h2>
            <span class="dedit-badge">公開中と同じ</span>
          </div>
          <button class="dedit-x" data-act="close-panel" aria-label="閉じる">✕</button>
        </header>
        <nav class="dedit-tabs">
          <button class="dedit-tab is-active" data-tab="list">作品</button>
          <button class="dedit-tab" data-tab="publish">公開</button>
          <button class="dedit-tab" data-tab="settings">設定</button>
        </nav>
        <div class="dedit-tabbody" data-body="list">
          <button class="dedit-add" data-act="add">＋ 新しい作品を追加</button>
          <p class="dedit-hint">カードをドラッグ、または ▲▼ で並び替えできます。上にあるものほどサイトの上に出ます。</p>
          <div class="dedit-list"></div>
        </div>
        <div class="dedit-tabbody" data-body="publish" hidden>
          <div class="dedit-card">
            <h3>① ブラウザだけで公開する</h3>
            <p class="dedit-hint">GitHubへ直接コミットします。1〜2分でサイトに反映されます。</p>
            <button class="dedit-btn dedit-btn--primary dedit-btn--wide" id="deditPublishBtn" data-act="publish">🚀 GitHubへ公開する</button>
            <div class="dedit-log" hidden></div>
          </div>
          <div class="dedit-card">
            <h3>② ファイルを書き出して手動で反映</h3>
            <p class="dedit-hint">works.js をダウンロードし、<code>assets/data/works.js</code> に上書きして git push してください。</p>
            <button class="dedit-btn dedit-btn--wide" data-act="download">⬇ works.js をダウンロード</button>
          </div>
          <div class="dedit-card">
            <h3>下書きの取り消し</h3>
            <p class="dedit-hint">編集内容をすべて捨てて、公開中の状態に戻します。</p>
            <button class="dedit-btn dedit-btn--danger dedit-btn--wide" data-act="discard">↺ 変更を破棄する</button>
          </div>
        </div>
        <div class="dedit-tabbody" data-body="settings" hidden>
          <div class="dedit-card">
            <h3>GitHub 接続設定</h3>
            <label class="dedit-lb">オーナー（ユーザー名）<input class="dedit-in" data-gh="owner" placeholder="shohei21"></label>
            <label class="dedit-lb">リポジトリ名<input class="dedit-in" data-gh="repo" placeholder="daco-portfolio"></label>
            <label class="dedit-lb">ブランチ<input class="dedit-in" data-gh="branch" placeholder="main"></label>
            <label class="dedit-lb">アクセストークン（PAT）
              <input class="dedit-in" type="password" data-gh="token" placeholder="github_pat_... / ghp_...">
            </label>
            <label class="dedit-check"><input type="checkbox" data-gh="remember"> このブラウザに保存する（オフならタブを閉じると消えます）</label>
            <p class="dedit-hint">GitHub → Settings → Developer settings → <b>Fine-grained tokens</b> で、このリポジトリのみ／<b>Contents: Read and write</b> のトークンを作成してください。</p>
            <button class="dedit-btn dedit-btn--primary" data-act="save-gh">接続設定を保存</button>
            <button class="dedit-btn" data-act="test-gh">接続テスト</button>
            <div class="dedit-log dedit-log--gh" hidden></div>
          </div>
          <div class="dedit-card">
            <h3>パスワードの変更</h3>
            <label class="dedit-lb">新しいパスワード<input class="dedit-in" type="password" data-pw="new"></label>
            <label class="dedit-lb">確認用<input class="dedit-in" type="password" data-pw="new2"></label>
            <button class="dedit-btn dedit-btn--primary" data-act="save-pw">パスワードを確定して公開</button>
            <p class="dedit-hint">GitHubへ <code>assets/js/edit-config.js</code> をコミットして確定します。接続設定が未入力の場合はファイル内容を表示するので、手動で置き換えてください。</p>
            <div class="dedit-log dedit-log--pw" hidden></div>
          </div>
          <div class="dedit-card">
            <h3>開き方（メモ）</h3>
            <p class="dedit-hint">フッター「DACO<b>.</b>」の <b>ドットを3回クリック</b>／スマホは<b>長押し</b>／<b>Ctrl+Shift+E</b>／URLに <code>#edit</code>。</p>
            <button class="dedit-btn dedit-btn--danger" data-act="lock">🔒 編集モードを終了（ロック）</button>
          </div>
        </div>
      </aside>`);

    /* --- 作品フォーム --- */
    const modal = el(`
      <div class="dedit-modal">
        <div class="dedit-modal__box">
          <header class="dedit-modal__head">
            <h2 class="dedit-modal__title">作品を追加</h2>
            <button class="dedit-x" data-act="form-cancel" aria-label="閉じる">✕</button>
          </header>
          <div class="dedit-modal__body"></div>
          <footer class="dedit-modal__foot">
            <button class="dedit-btn dedit-btn--ghost" data-act="form-cancel">キャンセル</button>
            <button class="dedit-btn dedit-btn--primary" data-act="form-save">保存する</button>
          </footer>
        </div>
      </div>`);

    const toastEl = el('<div class="dedit-toast" hidden></div>');

    root.appendChild(gate);
    root.appendChild(banner);
    root.appendChild(drawer);
    root.appendChild(modal);
    root.appendChild(toastEl);
    document.body.appendChild(root);

    ui = {
      root, gate, banner, drawer, modal, toast: toastEl,
      gatePw: $('.dedit-gate__pw', gate),
      gatePw2: $('.dedit-gate__confirm', gate),
      list: $('.dedit-list', drawer),
      body: $('.dedit-modal__body', modal)
    };

    /* --- イベント --- */
    root.addEventListener('click', onClick);
    gate.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitGate(); });
    $$('.dedit-tab', drawer).forEach((t) =>
      t.addEventListener('click', () => {
        $$('.dedit-tab', drawer).forEach((x) => x.classList.toggle('is-active', x === t));
        $$('.dedit-tabbody', drawer).forEach((b) => (b.hidden = b.dataset.body !== t.dataset.tab));
      })
    );
    fillSettings();
  }

  function toast(msg, isErr) {
    if (!ui) return;
    ui.toast.textContent = msg;
    ui.toast.classList.toggle('is-err', !!isErr);
    ui.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { ui.toast.hidden = true; }, 4200);
  }

  function openPanel() { buildUI(); ui.root.classList.add('is-open'); }
  function closePanel() { if (ui) ui.root.classList.remove('is-open'); }

  /* ------------------------------ クリック処理 ------------------------------ */
  function onClick(e) {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const card = e.target.closest('[data-idx]');
    const idx = card ? Number(card.dataset.idx) : -1;

    switch (act) {
      case 'gate-ok': submitGate(); break;
      case 'gate-cancel': closeGate(); break;
      case 'open-panel': openPanel(); break;
      case 'close-panel': closePanel(); break;
      case 'add': openForm(-1); break;
      case 'edit': openForm(idx); break;
      case 'dup': {
        const c = clone(works[idx]); c.id = uid(); c.title += '（コピー）';
        works.splice(idx + 1, 0, c); commit(); break;
      }
      case 'del': {
        if (!confirm(`「${works[idx].title || '無題'}」を削除します。よろしいですか？`)) return;
        works.splice(idx, 1); commit(); break;
      }
      case 'up': if (idx > 0) { works.splice(idx - 1, 0, works.splice(idx, 1)[0]); commit(); } break;
      case 'down': if (idx < works.length - 1) { works.splice(idx + 1, 0, works.splice(idx, 1)[0]); commit(); } break;
      case 'toggle-hide': works[idx].hidden = !works[idx].hidden; commit(); break;
      case 'form-cancel': closeForm(); break;
      case 'form-save': saveForm(); break;
      case 'download': downloadWorks(); break;
      case 'discard':
        if (!confirm('編集した内容をすべて破棄して、公開中の状態に戻します。よろしいですか？')) return;
        localStorage.removeItem(LS.draft);
        works = clone(published());
        commit(); toast('変更を破棄しました');
        break;
      case 'publish': publish(); break;
      case 'save-gh': saveSettings(); break;
      case 'test-gh': testGh(); break;
      case 'save-pw': savePassword(); break;
      case 'lock':
        unlocked = false; closePanel();
        works = clone(published()); window.DacoWorks.render(works);
        toast('編集モードを終了しました');
        break;
    }
  }

  function commit() { saveDraft(); renderList(); applyPreview(); }

  /* ------------------------------ 作品リスト ------------------------------- */
  // 旧形式(youtubeId 単体)のデータも編集できるように正規化する
  function videosOf(w) {
    if (Array.isArray(w.videos) && w.videos.length) return w.videos;
    if (w.youtubeId) return [{ id: w.youtubeId, label: '', thumb: w.thumb || '' }];
    return [];
  }
  function normalize(w) {
    w.videos = videosOf(w).map((v) => ({ id: v.id || '', label: v.label || '', thumb: v.thumb || '' }));
    delete w.youtubeId;
    delete w.thumb;
    if (!w.videos.length) w.videos = [{ id: '', label: '', thumb: '' }];
    return w;
  }
  function thumbOf(w) {
    if (w.type === 'image') return (w.images && w.images[0] && w.images[0].src) || '';
    const v = videosOf(w)[0];
    if (!v) return '';
    if (v.thumb) return v.thumb;
    if (v.id) return `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`;
    return '';
  }

  function renderList() {
    if (!ui) return;
    ui.list.innerHTML = works
      .map((w, i) => {
        const t = thumbOf(w);
        return `<div class="dedit-item${w.hidden ? ' is-hidden' : ''}" data-idx="${i}" draggable="true">
          <div class="dedit-item__grip" title="ドラッグで並び替え">⠿</div>
          <div class="dedit-item__thumb">${t ? `<img src="${esc(t)}" alt="">` : '<span>—</span>'}</div>
          <div class="dedit-item__main">
            <p class="dedit-item__title">${esc(w.title || '（無題）')}</p>
            <p class="dedit-item__meta">${w.type === 'image' ? '🖼 画像 ' + ((w.images||[]).length) + '枚' : '🎬 動画 ' + videosOf(w).length + '本' + (w.vertical ? '・縦型' : '')}${w.hidden ? ' ・<b>非表示</b>' : ''}</p>
          </div>
          <div class="dedit-item__ops">
            <button class="dedit-mini" data-act="up" title="上へ">▲</button>
            <button class="dedit-mini" data-act="down" title="下へ">▼</button>
            <button class="dedit-mini" data-act="toggle-hide" title="表示/非表示">${w.hidden ? '🚫' : '👁'}</button>
            <button class="dedit-mini" data-act="dup" title="複製">⧉</button>
            <button class="dedit-mini dedit-mini--danger" data-act="del" title="削除">🗑</button>
            <button class="dedit-mini dedit-mini--edit" data-act="edit">編集</button>
          </div>
        </div>`;
      })
      .join('');
    installDnD();
  }

  function installDnD() {
    let from = -1;
    $$('.dedit-item', ui.list).forEach((item) => {
      item.addEventListener('dragstart', (e) => {
        from = Number(item.dataset.idx);
        item.classList.add('is-drag');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', String(from)); } catch (err) {}
      });
      item.addEventListener('dragend', () => item.classList.remove('is-drag'));
      item.addEventListener('dragover', (e) => { e.preventDefault(); item.classList.add('is-over'); });
      item.addEventListener('dragleave', () => item.classList.remove('is-over'));
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('is-over');
        const to = Number(item.dataset.idx);
        if (from < 0 || from === to) return;
        works.splice(to, 0, works.splice(from, 1)[0]);
        commit();
      });
    });
  }

  /* -------------------------------- フォーム ------------------------------- */
  let formIdx = -1;
  let formData = null;

  function blankWork() {
    return {
      id: uid(), type: 'youtube', title: '', vertical: false,
      videos: [{ id: '', label: '', thumb: '' }],
      images: [],
      badges: [{ text: 'AI Video', style: '' }],
      overview: '',
      points: [
        { label: 'こだわった点', text: '' },
        { label: '工夫した点', text: '' },
        { label: '見てほしい点', text: '' }
      ],
      tools: '', range: '', linkUrl: '', linkLabel: '', hidden: false
    };
  }

  const BADGE_STYLES = [
    { v: '', n: '標準（グレー）' },
    { v: 'award', n: '受賞（ゴールド）' },
    { v: 'image', n: 'AI Image（ピンク）' },
    { v: 'outline', n: '枠線のみ' }
  ];
  const BADGE_PRESETS = [
    { text: '🏆 MVP 受賞', style: 'award' },
    { text: 'AI Video', style: '' },
    { text: 'AI Image', style: 'image' },
    { text: 'コンテスト応募', style: 'outline' },
    { text: 'SNS投稿用', style: 'outline' },
    { text: 'クライアントワーク', style: 'outline' }
  ];

  function openForm(idx) {
    buildUI();
    formIdx = idx;
    formData = normalize(idx < 0 ? blankWork() : clone(works[idx]));
    $('.dedit-modal__title', ui.modal).textContent = idx < 0 ? '作品を追加' : '作品を編集';
    renderForm();
    ui.modal.classList.add('is-open');
    ui.root.classList.add('has-modal');
  }
  function closeForm() {
    if (!ui) return;
    ui.modal.classList.remove('is-open');
    ui.root.classList.remove('has-modal');
  }

  function renderForm() {
    const d = formData;
    ui.body.innerHTML = `
      <section class="dedit-fs">
        <h3 class="dedit-fs__t"><span>1</span>メディアの種類</h3>
        <div class="dedit-seg">
          <label class="dedit-segbtn${d.type === 'youtube' ? ' is-on' : ''}"><input type="radio" name="dtype" value="youtube" ${d.type==='youtube'?'checked':''}>🎬 動画（YouTube）</label>
          <label class="dedit-segbtn${d.type === 'image' ? ' is-on' : ''}"><input type="radio" name="dtype" value="image" ${d.type==='image'?'checked':''}>🖼 画像（ギャラリー）</label>
        </div>
        <div class="dedit-media"></div>
      </section>

      <section class="dedit-fs">
        <h3 class="dedit-fs__t"><span>2</span>基本情報</h3>
        <label class="dedit-lb">作品タイトル <b class="dedit-req">必須</b>
          <input class="dedit-in" data-f="title" value="${esc(d.title)}" placeholder="例）超次元サッカー">
        </label>
        <label class="dedit-lb">概要（1〜3行）
          <textarea class="dedit-in dedit-ta" data-f="overview" rows="3" placeholder="どんな作品かを短く説明します">${esc(d.overview)}</textarea>
        </label>
        <div class="dedit-lb">バッジ（作品の上に出るラベル）
          <div class="dedit-badges"></div>
          <div class="dedit-presets">
            ${BADGE_PRESETS.map((p, i) => `<button type="button" class="dedit-chip" data-preset="${i}">＋ ${esc(p.text)}</button>`).join('')}
            <button type="button" class="dedit-chip dedit-chip--free" data-preset="free">＋ 自由入力</button>
          </div>
        </div>
      </section>

      <section class="dedit-fs">
        <h3 class="dedit-fs__t"><span>3</span>アピールポイント</h3>
        <div class="dedit-points"></div>
        <button type="button" class="dedit-btn dedit-btn--sm" data-pt="add">＋ 項目を追加</button>
      </section>

      <section class="dedit-fs">
        <h3 class="dedit-fs__t"><span>4</span>制作情報</h3>
        <label class="dedit-lb">使用ツール
          <input class="dedit-in" data-f="tools" value="${esc(d.tools)}" placeholder="例）ChatGPT / Midjourney / Seedance2.0">
        </label>
        <label class="dedit-lb">担当範囲
          <input class="dedit-in" data-f="range" value="${esc(d.range)}" placeholder="例）企画・構成・画像生成・動画生成（ALL）">
        </label>
        <div class="dedit-2col">
          <label class="dedit-lb">関連リンクURL（任意）
            <input class="dedit-in" data-f="linkUrl" value="${esc(d.linkUrl)}" placeholder="https://x.com/...">
          </label>
          <label class="dedit-lb">リンクの文言
            <input class="dedit-in" data-f="linkLabel" value="${esc(d.linkLabel)}" placeholder="受賞発表ポストを見る">
          </label>
        </div>
        <label class="dedit-check"><input type="checkbox" data-f="hidden" ${d.hidden ? 'checked' : ''}> この作品をサイトに表示しない（下書き扱い）</label>
      </section>`;

    renderMediaBlock();
    renderBadges();
    renderPoints();

    // 入力バインド
    $$('[data-f]', ui.body).forEach((inp) => {
      inp.addEventListener('input', () => {
        const k = inp.dataset.f;
        formData[k] = inp.type === 'checkbox' ? inp.checked : inp.value;
      });
    });
    $$('input[name=dtype]', ui.body).forEach((r) =>
      r.addEventListener('change', () => {
        formData.type = r.value;
        $$('.dedit-segbtn', ui.body).forEach((l) => l.classList.toggle('is-on', l.contains(r) && r.checked));
        renderMediaBlock();
      })
    );
    $$('[data-preset]', ui.body).forEach((b) =>
      b.addEventListener('click', () => {
        if (b.dataset.preset === 'free') formData.badges.push({ text: '', style: 'outline' });
        else formData.badges.push(clone(BADGE_PRESETS[Number(b.dataset.preset)]));
        renderBadges();
      })
    );
    $('[data-pt=add]', ui.body).addEventListener('click', () => {
      formData.points.push({ label: '', text: '' });
      renderPoints();
    });
  }

  function renderMediaBlock() {
    const box = $('.dedit-media', ui.body);
    const d = formData;
    if (d.type === 'youtube') {
      box.innerHTML = `
        <label class="dedit-check"><input type="checkbox" id="deditVert" ${d.vertical ? 'checked' : ''}> 縦型（Shorts）として表示する</label>
        <p class="dedit-hint">YouTubeのURLを貼るだけでOK。複数本を登録すると、作品カードの下にサムネイルの切り替えボタンが並びます（1本目が最初に表示されます）。</p>
        <div class="dedit-vids"></div>
        <button type="button" class="dedit-btn dedit-btn--sm" id="deditVidAdd">＋ 動画を追加</button>`;
      $('#deditVert', box).addEventListener('change', (e) => { d.vertical = e.target.checked; renderVideos(); });
      $('#deditVidAdd', box).addEventListener('click', () => {
        d.videos.push({ id: '', label: '', thumb: '' });
        renderVideos();
        const rows = $$('.dedit-vid', ui.body);
        const last = rows[rows.length - 1];
        if (last) $('[data-vurl]', last).focus();
      });
      renderVideos();
    } else {
      box.innerHTML = `
        <div class="dedit-drop" id="deditDrop">
          <p><b>ここに画像をドラッグ＆ドロップ</b></p>
          <p class="dedit-hint">またはクリックしてファイルを選択（複数可・自動で1600pxに縮小）</p>
          <input type="file" id="deditImgFile" accept="image/*" multiple hidden>
        </div>
        <div class="dedit-imgs"></div>`;
      const drop = $('#deditDrop', box);
      const file = $('#deditImgFile', box);
      drop.addEventListener('click', () => file.click());
      drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-over'); });
      drop.addEventListener('dragleave', () => drop.classList.remove('is-over'));
      drop.addEventListener('drop', async (e) => {
        e.preventDefault();
        drop.classList.remove('is-over');
        await addImages(e.dataTransfer.files);
      });
      file.addEventListener('change', async (e) => { await addImages(e.target.files); file.value = ''; });
      renderImages();
    }
  }

  function renderVideos() {
    const box = $('.dedit-vids', ui.body);
    if (!box) return;
    const d = formData;
    box.innerHTML = d.videos
      .map(
        (v, i) => `<div class="dedit-vid" data-i="${i}">
          <div class="dedit-vid__no">${i + 1}</div>
          <div class="dedit-vid__main">
            <input class="dedit-in dedit-in--sm" data-vurl="${i}" value="${esc(v.id)}" placeholder="https://youtu.be/xxxxxxxxxxx を貼り付け">
            <input class="dedit-in dedit-in--sm" data-vlabel="${i}" value="${esc(v.label)}" placeholder="この動画のラベル（例：本編／メイキング）任意">
            <div class="dedit-vid__prev"></div>
            <div class="dedit-vid__ops">
              <button type="button" class="dedit-mini" data-vid="up" data-i="${i}" title="上へ">▲</button>
              <button type="button" class="dedit-mini" data-vid="down" data-i="${i}" title="下へ">▼</button>
              <button type="button" class="dedit-mini" data-vid="thumb" data-i="${i}">サムネ指定</button>
              ${v.thumb ? `<button type="button" class="dedit-mini" data-vid="thumbdel" data-i="${i}">サムネ解除</button>` : ''}
              <button type="button" class="dedit-mini dedit-mini--danger" data-vid="del" data-i="${i}">削除</button>
            </div>
          </div>
        </div>`
      )
      .join('');

    // サムネ選択用の隠しファイル入力
    if (!$('#deditVidThumbFile', ui.body)) {
      box.insertAdjacentHTML('afterend', '<input type="file" id="deditVidThumbFile" accept="image/*" hidden>');
      $('#deditVidThumbFile', ui.body).addEventListener('change', async (e) => {
        const f = e.target.files && e.target.files[0];
        const i = Number(e.target.dataset.i);
        e.target.value = '';
        if (!f || isNaN(i)) return;
        const r = await processImage(f);
        d.videos[i].thumb = r.src;
        renderVideos();
      });
    }

    const drawPrev = (i) => {
      const row = $(`.dedit-vid[data-i="${i}"]`, box);
      if (!row) return;
      const v = d.videos[i];
      const prev = $('.dedit-vid__prev', row);
      const raw = $(`[data-vurl="${i}"]`, box).value;
      prev.innerHTML = v.thumb
        ? `<div class="dedit-prevbox"><img src="${esc(v.thumb)}" alt=""><span>✔ 指定サムネイル${v.id ? '（動画ID: <b>' + esc(v.id) + '</b>）' : ''}</span></div>`
        : v.id
        ? `<div class="dedit-prevbox"><img src="https://i.ytimg.com/vi/${esc(v.id)}/mqdefault.jpg" alt=""><span>✔ 動画ID: <b>${esc(v.id)}</b></span></div>`
        : raw
        ? '<p class="dedit-err">YouTubeのURL/IDが読み取れません</p>'
        : '';
    };

    $$('[data-vurl]', box).forEach((inp) =>
      inp.addEventListener('input', () => {
        const i = Number(inp.dataset.vurl);
        d.videos[i].id = parseYouTube(inp.value);
        if (/\/shorts\//.test(inp.value) && !d.vertical) {
          d.vertical = true;
          const vc = $('#deditVert', ui.body);
          if (vc) vc.checked = true;
        }
        drawPrev(i);
      })
    );
    $$('[data-vlabel]', box).forEach((inp) =>
      inp.addEventListener('input', () => { d.videos[Number(inp.dataset.vlabel)].label = inp.value; })
    );
    $$('[data-vid]', box).forEach((b) =>
      b.addEventListener('click', () => {
        const i = Number(b.dataset.i);
        const a = d.videos;
        switch (b.dataset.vid) {
          case 'del':
            if (a.length <= 1) { a[0] = { id: '', label: '', thumb: '' }; }
            else a.splice(i, 1);
            break;
          case 'up': if (i > 0) a.splice(i - 1, 0, a.splice(i, 1)[0]); break;
          case 'down': if (i < a.length - 1) a.splice(i + 1, 0, a.splice(i, 1)[0]); break;
          case 'thumbdel': a[i].thumb = ''; break;
          case 'thumb': {
            const f = $('#deditVidThumbFile', ui.body);
            f.dataset.i = String(i);
            f.click();
            return;
          }
        }
        renderVideos();
      })
    );
    d.videos.forEach((_, i) => drawPrev(i));
  }

  async function addImages(files) {
    const arr = Array.from(files || []).filter((f) => /^image\//.test(f.type));
    if (!arr.length) return;
    toast('画像を読み込み中…');
    for (const f of arr) {
      const r = await processImage(f);
      formData.images.push({ src: r.src, alt: '', name: r.name });
    }
    renderImages();
    toast(arr.length + '枚追加しました');
  }

  function renderImages() {
    const box = $('.dedit-imgs', ui.body);
    if (!box) return;
    const imgs = formData.images || [];
    box.innerHTML = imgs
      .map(
        (im, i) => `<div class="dedit-img" data-i="${i}">
          <img src="${esc(im.src)}" alt="">
          <div class="dedit-img__side">
            <input class="dedit-in dedit-in--sm" data-alt="${i}" value="${esc(im.alt)}" placeholder="画像の説明（任意）">
            <div class="dedit-img__ops">
              <button type="button" class="dedit-mini" data-img="up" data-i="${i}">▲</button>
              <button type="button" class="dedit-mini" data-img="down" data-i="${i}">▼</button>
              <button type="button" class="dedit-mini dedit-mini--danger" data-img="del" data-i="${i}">削除</button>
              <span class="dedit-img__size">${/^data:/.test(im.src) ? fmtSize(bytesOfDataUrl(im.src)) + '・未アップロード' : '公開済'}</span>
            </div>
          </div>
        </div>`
      )
      .join('');
    if (imgs.length) box.insertAdjacentHTML('afterbegin', '<p class="dedit-hint">1枚目がメイン画像になります。</p>');
    $$('[data-img]', box).forEach((b) =>
      b.addEventListener('click', () => {
        const i = Number(b.dataset.i);
        const a = formData.images;
        if (b.dataset.img === 'del') a.splice(i, 1);
        if (b.dataset.img === 'up' && i > 0) a.splice(i - 1, 0, a.splice(i, 1)[0]);
        if (b.dataset.img === 'down' && i < a.length - 1) a.splice(i + 1, 0, a.splice(i, 1)[0]);
        renderImages();
      })
    );
    $$('[data-alt]', box).forEach((inp) =>
      inp.addEventListener('input', () => { formData.images[Number(inp.dataset.alt)].alt = inp.value; })
    );
  }

  function renderBadges() {
    const box = $('.dedit-badges', ui.body);
    box.innerHTML = formData.badges
      .map(
        (b, i) => `<div class="dedit-badgerow" data-i="${i}">
          <input class="dedit-in dedit-in--sm" data-bt="${i}" value="${esc(b.text)}" placeholder="バッジの文字">
          <select class="dedit-in dedit-in--sm" data-bs="${i}">
            ${BADGE_STYLES.map((s) => `<option value="${s.v}" ${s.v === (b.style||'') ? 'selected' : ''}>${s.n}</option>`).join('')}
          </select>
          <button type="button" class="dedit-mini dedit-mini--danger" data-bd="${i}">✕</button>
        </div>`
      )
      .join('');
    $$('[data-bt]', box).forEach((i) => i.addEventListener('input', () => { formData.badges[Number(i.dataset.bt)].text = i.value; }));
    $$('[data-bs]', box).forEach((i) => i.addEventListener('change', () => { formData.badges[Number(i.dataset.bs)].style = i.value; }));
    $$('[data-bd]', box).forEach((i) => i.addEventListener('click', () => { formData.badges.splice(Number(i.dataset.bd), 1); renderBadges(); }));
  }

  function renderPoints() {
    const box = $('.dedit-points', ui.body);
    box.innerHTML = formData.points
      .map(
        (p, i) => `<div class="dedit-pointrow">
          <input class="dedit-in dedit-in--sm dedit-in--label" data-pl="${i}" value="${esc(p.label)}" placeholder="項目名">
          <input class="dedit-in dedit-in--sm" data-px="${i}" value="${esc(p.text)}" placeholder="内容">
          <button type="button" class="dedit-mini dedit-mini--danger" data-pd="${i}">✕</button>
        </div>`
      )
      .join('');
    $$('[data-pl]', box).forEach((i) => i.addEventListener('input', () => { formData.points[Number(i.dataset.pl)].label = i.value; }));
    $$('[data-px]', box).forEach((i) => i.addEventListener('input', () => { formData.points[Number(i.dataset.px)].text = i.value; }));
    $$('[data-pd]', box).forEach((i) => i.addEventListener('click', () => { formData.points.splice(Number(i.dataset.pd), 1); renderPoints(); }));
  }

  function saveForm() {
    const d = formData;
    if (!String(d.title).trim()) { toast('作品タイトルを入力してください', true); return; }
    if (d.type === 'youtube') {
      d.videos = (d.videos || []).filter((v) => v && v.id);
      if (!d.videos.length) { toast('YouTubeのURLまたは動画IDを入力してください', true); return; }
    } else {
      d.videos = [];
    }
    if (d.type === 'image' && !(d.images || []).length) { toast('画像を1枚以上追加してください', true); return; }
    d.badges = (d.badges || []).filter((b) => b.text && b.text.trim());
    d.points = (d.points || []).filter((p) => (p.label && p.label.trim()) || (p.text && p.text.trim()));
    if (formIdx < 0) works.push(d); else works[formIdx] = d;
    closeForm();
    commit();
    toast(formIdx < 0 ? '作品を追加しました（まだ公開されていません）' : '保存しました（まだ公開されていません）');
  }

  /* ------------------------------- 画像処理 -------------------------------- */
  function processImage(file) {
    const MAX = 1600;
    return new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => {
        const src = String(fr.result);
        const img = new Image();
        img.onload = () => {
          const scale = Math.min(1, MAX / Math.max(img.width, img.height));
          if (scale === 1 && src.length < 700 * 1024) return resolve({ src, name: file.name });
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          const ctx = c.getContext('2d');
          if (file.type !== 'image/png') { ctx.fillStyle = '#0A0E2B'; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          const out = file.type === 'image/png' ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.86);
          resolve({ src: out.length < src.length ? out : src, name: file.name });
        };
        img.onerror = () => resolve({ src, name: file.name });
        img.src = src;
      };
      fr.readAsDataURL(file);
    });
  }

  /* ------------------------------ 書き出し／公開 ----------------------------- */
  function serializeWorks(list) {
    return (
      '/* ============================================================\n' +
      '   DACO PORTFOLIO — 作品データ\n' +
      '   このファイルは「編集モード」から自動生成・更新されます。\n' +
      '   手で直接編集してもOK（JSON部分だけ書き換えてください）。\n' +
      '   ============================================================ */\n' +
      'window.DACO_WORKS = ' +
      JSON.stringify({ version: 1, works: list }, null, 2) +
      ';\n'
    );
  }

  function downloadWorks() {
    const text = serializeWorks(works);
    const pending = countPendingImages();
    const blob = new Blob([text], { type: 'text/javascript;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'works.js';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast(
      pending
        ? `ダウンロードしました（未アップロード画像 ${pending} 枚はファイル内に埋め込まれます・約 ${fmtSize(text.length)}）`
        : 'works.js をダウンロードしました'
    );
  }

  function countPendingImages() {
    let n = 0;
    works.forEach((w) => {
      (w.images || []).forEach((im) => { if (/^data:/.test(im.src)) n++; });
      (w.videos || []).forEach((v) => { if (/^data:/.test(v.thumb || '')) n++; });
    });
    return n;
  }

  /* -------------------------------- GitHub -------------------------------- */
  function ghConf() {
    const g = getGh();
    g.token = getToken();
    return g;
  }
  async function ghFetch(path, opts) {
    const g = ghConf();
    if (!g.owner || !g.repo) throw new Error('GitHubの「オーナー」「リポジトリ名」が未設定です（設定タブ）');
    if (!g.token) throw new Error('アクセストークンが未設定です（設定タブ）');
    const res = await fetch(`https://api.github.com/repos/${g.owner}/${g.repo}${path}`, Object.assign({
      headers: {
        Authorization: 'Bearer ' + g.token,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }, opts || {}));
    return res;
  }
  async function ghGetSha(path) {
    const g = ghConf();
    const res = await ghFetch(`/contents/${path}?ref=${encodeURIComponent(g.branch || 'main')}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`取得失敗 (${res.status}) ${path}`);
    const j = await res.json();
    return j.sha || null;
  }
  async function ghPut(path, base64, message) {
    const g = ghConf();
    const sha = await ghGetSha(path);
    const body = { message, content: base64, branch: g.branch || 'main' };
    if (sha) body.sha = sha;
    const res = await ghFetch(`/contents/${path}`, { method: 'PUT', body: JSON.stringify(body) });
    if (!res.ok) {
      let msg = '';
      try { msg = (await res.json()).message || ''; } catch (e) {}
      throw new Error(`書き込み失敗 (${res.status}) ${path} ${msg}`);
    }
    return res.json();
  }

  function logTo(sel, msg, cls) {
    const box = $(sel, ui.drawer);
    box.hidden = false;
    box.insertAdjacentHTML('beforeend', `<p class="${cls || ''}">${esc(msg)}</p>`);
    box.scrollTop = box.scrollHeight;
  }

  async function testGh() {
    const box = $('.dedit-log--gh', ui.drawer);
    box.innerHTML = '';
    try {
      logTo('.dedit-log--gh', '接続中…');
      const res = await ghFetch('');
      if (!res.ok) throw new Error(`応答 ${res.status}（トークンの権限／リポジトリ名を確認してください）`);
      const j = await res.json();
      logTo('.dedit-log--gh', `✔ 接続OK: ${j.full_name}（既定ブランチ ${j.default_branch}）`, 'ok');
    } catch (e) {
      logTo('.dedit-log--gh', '✕ ' + e.message, 'ng');
    }
  }

  async function publish() {
    const btn = $('#deditPublishBtn');
    const box = $('.dedit-log', ui.drawer);
    box.innerHTML = '';
    btn.disabled = true;
    try {
      const g = ghConf();
      if (!g.token) throw new Error('アクセストークンが未設定です。「設定」タブで登録してください');
      const out = clone(works);
      const stamp = Date.now().toString(36);

      // 1) 画像アップロード
      let n = 0;
      for (let wi = 0; wi < out.length; wi++) {
        const w = out[wi];
        const targets = [];
        (w.images || []).forEach((im, i) => { if (/^data:/.test(im.src)) targets.push({ obj: im, key: 'src', i }); });
        (w.videos || []).forEach((v, i) => { if (/^data:/.test(v.thumb || '')) targets.push({ obj: v, key: 'thumb', i: 'thumb' + (i + 1) }); });
        for (const t of targets) {
          const dataUrl = t.obj[t.key];
          const ext = /^data:image\/png/.test(dataUrl) ? 'png' : 'jpg';
          const path = `${PATHS.imageDir}/w${wi + 1}-${stamp}-${t.i}.${ext}`;
          logTo('.dedit-log', `画像をアップロード中… ${path}`);
          await ghPut(path, dataUrl.split(',')[1], `画像追加: ${path}`);
          t.obj[t.key] = path;
          n++;
        }
      }
      if (n) logTo('.dedit-log', `✔ 画像 ${n} 枚をアップロードしました`, 'ok');

      // 2) works.js を更新
      logTo('.dedit-log', 'works.js を更新中…');
      await ghPut(PATHS.works, b64utf8(serializeWorks(out)), `作品データ更新（編集モード）`);
      logTo('.dedit-log', '✔ 公開しました！1〜2分でサイトに反映されます', 'ok');
      logTo('.dedit-log', `https://${g.owner}.github.io/${g.repo}/`, 'ok');

      // ローカル状態を「公開済み」に合わせる
      window.DACO_WORKS.works = clone(out);
      works = clone(out);
      localStorage.removeItem(LS.draft);
      renderList();
      applyPreview();
      toast('公開しました！');
    } catch (e) {
      logTo('.dedit-log', '✕ ' + e.message, 'ng');
      toast('公開に失敗しました: ' + e.message, true);
    } finally {
      btn.disabled = !hasDraft();
    }
  }

  /* -------------------------------- 設定 ---------------------------------- */
  function fillSettings() {
    const g = getGh();
    $('[data-gh=owner]', ui.drawer).value = g.owner || '';
    $('[data-gh=repo]', ui.drawer).value = g.repo || '';
    $('[data-gh=branch]', ui.drawer).value = g.branch || 'main';
    $('[data-gh=token]', ui.drawer).value = getToken();
    $('[data-gh=remember]', ui.drawer).checked = !!localStorage.getItem(LS.token);
  }
  function saveSettings() {
    const owner = $('[data-gh=owner]', ui.drawer).value.trim();
    const repo = $('[data-gh=repo]', ui.drawer).value.trim();
    const branch = $('[data-gh=branch]', ui.drawer).value.trim() || 'main';
    const token = $('[data-gh=token]', ui.drawer).value.trim();
    const remember = $('[data-gh=remember]', ui.drawer).checked;
    setGh({ owner, repo, branch });
    setToken(token, remember);
    toast('接続設定を保存しました');
  }

  function configFileText(hash) {
    const g = getGh();
    return `/* ============================================================
   編集モードの設定ファイル
   ※ パスワードの「平文」はここには入りません（SHA-256ハッシュのみ）。
   ============================================================ */
window.DACO_EDIT_CONFIG = {
  // パスワードのSHA-256ハッシュ（16進64文字）。空 = 未設定
  passHash: '${hash}',

  // GitHub直接公開のデフォルト設定（トークンはここに書かず、ブラウザに保存されます）
  github: {
    owner: '${g.owner}',
    repo: '${g.repo}',
    branch: '${g.branch || 'main'}'
  },

  // 公開時に更新するファイルのパス
  paths: {
    works: '${PATHS.works}',
    config: '${PATHS.config}',
    imageDir: '${PATHS.imageDir}'
  }
};
`;
  }

  async function savePassword() {
    const box = $('.dedit-log--pw', ui.drawer);
    box.innerHTML = '';
    const a = $('[data-pw=new]', ui.drawer).value;
    const b = $('[data-pw=new2]', ui.drawer).value;
    if (a.length < 6) { logTo('.dedit-log--pw', '✕ 6文字以上にしてください', 'ng'); return; }
    if (a !== b) { logTo('.dedit-log--pw', '✕ 確認用が一致しません', 'ng'); return; }
    const hash = sha256Hex(a);
    localStorage.setItem(LS.pass, hash);
    CFG.passHash = hash;
    const text = configFileText(hash);
    try {
      logTo('.dedit-log--pw', 'edit-config.js を更新中…');
      await ghPut(PATHS.config, b64utf8(text), 'パスワード更新（編集モード）');
      logTo('.dedit-log--pw', '✔ パスワードを確定しました（1〜2分で反映）', 'ok');
      $('[data-pw=new]', ui.drawer).value = '';
      $('[data-pw=new2]', ui.drawer).value = '';
    } catch (e) {
      logTo('.dedit-log--pw', '✕ 自動保存できません: ' + e.message, 'ng');
      logTo('.dedit-log--pw', '↓ 下の内容を assets/js/edit-config.js に貼り付けて push してください');
      const pre = document.createElement('textarea');
      pre.className = 'dedit-in dedit-ta';
      pre.rows = 10;
      pre.value = text;
      pre.readOnly = true;
      box.appendChild(pre);
    }
  }

  /* -------------------------------- 起動 ---------------------------------- */
  // 下書きが残っていれば、ロック解除前でも本人に気づけるよう何もしない（公開データを表示）
  installTriggers();
  window.DacoEdit = { open: openGate };
})();
