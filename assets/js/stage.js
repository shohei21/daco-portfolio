/* ============================================================
   DACO — STAGE（オープニング演出）
   スクロール量 p (0→1) に合わせて、次の順で進む:
     0.00〜0.10  カーテンの隙間から顔を出していたDACOが飛び出す
     0.10〜0.58  DACOが右のカーテンを押して、幕が開く（WebGLの布）
     0.58〜0.74  ジャンプしてピースのポーズに変身（キラキラ）
     0.40〜0.88  奥の舞台のコピーが順に浮かび上がる
   ほか: 作品データからLEDウォール・ポスター・フィルムストリップを生成、
         ハイライトのカウントアップ、カーソルのスポットライト、進捗バー
   ============================================================ */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const seg = (p, a, b) => clamp((p - a) / (b - a));
  const mix = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const backOut = (t) => 1 + 2.2 * Math.pow(t - 1, 3) + 1.2 * Math.pow(t - 1, 2);

  const stage = $('#stage');
  if (!stage) return;
  const pin = $('.stage__pin', stage);
  const hero = $('#hero');
  const actor = $('#actor');
  const actorBody = $('.actor__body', actor);
  const bubble = $('#actorBubble');
  const glCanvas = $('#curtainGL');
  const crowd = $('#crowd');
  const fxCanvas = $('#stageFx');
  const valance = $('.stage__valance', stage);
  const floorEl = $('.stage__floor', stage);
  const nav = $('#nav');
  const heroItems = Array.from(hero.querySelectorAll('[data-hero]'));

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;
  const t18 = (k) => (window.DacoI18n ? window.DacoI18n.t(k) : '');

  /* ------------------------------------------------------------
     作品データ → サムネイル一覧
     ------------------------------------------------------------ */
  function collectThumbs() {
    const W = window.DacoWorks;
    const works = ((window.DACO_WORKS && window.DACO_WORKS.works) || []).filter((w) => w && !w.hidden);
    const pick = (o, f) => (window.DacoI18n ? window.DacoI18n.pick(o, f) : o[f]);
    const out = [];
    works.forEach((w) => {
      const title = pick(w, 'title');
      if (w.type === 'image') {
        (w.images || []).forEach((im) => im && im.src && out.push({ src: im.src, title, id: w.id }));
      } else if (W) {
        W.mediaOf(w).forEach((m) => {
          let src = m.thumb || '';
          if (!src && m.kind === 'youtube') src = `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`;
          if (!src && m.kind === 'image') src = m.src;
          if (src) out.push({ src, title: pick(m, 'label') || title, id: w.id });
        });
      }
    });
    return { thumbs: out, count: works.length };
  }
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function buildWall(thumbs) {
    const wall = $('#stageWall');
    if (!wall || !thumbs.length) return;
    let rows = '';
    for (let r = 0; r < 3; r++) {
      const list = thumbs.slice(r % thumbs.length).concat(thumbs.slice(0, r % thumbs.length));
      const imgs = list.map((t) => `<img src="${esc(t.src)}" alt="" loading="lazy" decoding="async">`).join('');
      rows += `<div class="stage__wall-row">${imgs}${imgs}${imgs.length < 6 ? imgs + imgs : ''}</div>`;
    }
    wall.innerHTML = rows;
  }

  // 浮かぶポスター（x,y は舞台に対する割合、d は奥行き＝パララックス量）
  const POSTER_LAYOUT = [
    { x: 0.53, y: 0.17, w: 0.12, d: 0.35, r: -7 },
    { x: 0.86, y: 0.56, w: 0.1, d: 0.7, r: 6 },
    { x: 0.6, y: 0.66, w: 0.09, d: 0.2, r: 4 },
    { x: 0.83, y: 0.15, w: 0.11, d: 0.55, r: -4 },
  ];
  let posters = [];
  function buildPosters(thumbs) {
    const box = $('#stagePosters');
    if (!box) return;
    const seen = new Set();
    const uniq = thumbs.filter((t) => (seen.has(t.id) ? false : seen.add(t.id)));
    box.innerHTML = POSTER_LAYOUT.slice(0, uniq.length)
      .map((L, i) => `<figure class="poster" style="--w:${L.w * 100}vw;left:${L.x * 100}%;top:${L.y * 100}%;filter:brightness(${(0.55 + L.d * 0.35).toFixed(2)})"><img src="${esc(uniq[i].src)}" alt="" loading="lazy" decoding="async"><figcaption>${esc(uniq[i].title)}</figcaption></figure>`)
      .join('');
    posters = Array.from(box.children).map((el, i) => ({ el, L: POSTER_LAYOUT[i] }));
  }

  function buildReel(thumbs) {
    const track = $('#reelTrack');
    if (!track || !thumbs.length) return;
    let list = thumbs.slice();
    while (list.length < 8) list = list.concat(thumbs);
    const html = list
      .map((t) => `<a class="reel__frame" href="#works" data-goto="${esc(t.id)}"><img src="${esc(t.src)}" alt="" loading="lazy" decoding="async"><span>${esc(t.title)}</span></a>`)
      .join('');
    track.innerHTML = html + html;
  }
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.reel__frame[data-goto]');
    if (!a) return;
    const target = document.querySelector(`#worksList [data-work-id="${CSS.escape(a.dataset.goto)}"]`);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  });

  function buildFromData() {
    const { thumbs, count } = collectThumbs();
    buildWall(thumbs);
    buildPosters(thumbs);
    buildReel(thumbs);
    const wc = $('[data-count="works"]');
    if (wc) wc.dataset.to = count;
    const tc = $('[data-count="tools"]');
    if (tc) tc.dataset.to = document.querySelectorAll('.tools__chips span').length;
  }
  buildFromData();
  window.addEventListener('daco:langchange', () => {
    buildFromData();
    lastBubble = null;
    layout();
    render(true);
  });

  /* ------------------------------------------------------------
     WebGL カーテン
     ------------------------------------------------------------ */
  const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime,uOpen,uSway,uFloor,uTop,uPeek,uPeekY,uPeekH,uPeekW,uOpenW,uSpotX,uSpotY,uSpot,uDpr;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float edgeAt(float Y,float side){
  float eo=(mix(0.125,0.072,Y)-0.03*exp(-pow((Y-0.66)/0.09,2.0)))*uOpenW;
  float e=mix(0.4985,eo,uOpen);
  e+=uSway*0.06*Y*Y*(1.0-uOpen*0.5);
  e+=(0.0025+0.007*abs(uSway))*sin(Y*7.0-uTime*1.3+side*2.1)*Y;
  e-=uPeek*uPeekW*exp(-pow((Y-uPeekY)/uPeekH,2.0));
  return e;
}
void main(){
  vec2 fc=gl_FragCoord.xy;
  float X=fc.x/uRes.x;
  float Y=1.0-fc.y/uRes.y;
  float side=step(0.5,X);
  float xs=mix(X,1.0-X,side);
  float e=edgeAt(Y,side);
  float px=uDpr;
  float d=(e-xs)*uRes.x/px;                 /* 内側の端からの距離(CSS px) */
  float hemY=uFloor+0.004*sin(xs*70.0+side*1.7);
  float dy=(hemY-Y)*uRes.y/px;              /* 裾からの距離(CSS px) */
  float ah=clamp(d+0.5,0.0,1.0);

  /* 影（カーテンの外側・裾の下） */
  float sh=0.0;
  if(d<0.0&&Y<hemY) sh=0.6*exp(d/55.0);
  if(dy<-12.0) sh=max(sh,0.55*exp((dy+12.0)/16.0)*clamp(d/20.0+1.0,0.0,1.0));

  /* 布の陰影 */
  float u=clamp(xs/max(e,0.001),0.0,1.0);
  float comp=clamp(1.0-e/0.5,0.0,1.0);
  float NF=7.5;
  float ph=u*NF+0.10*sin(Y*5.0+u*8.0+side*3.0)+side*0.37;
  float s=sin(ph*6.2831853);
  float depth=mix(0.55,1.0,comp);
  float L=pow(mix(0.5,0.5+0.5*s,depth),1.25);
  float rim=pow(1.0-abs(s),5.0)*depth;
  vec3 dark=vec3(0.05,0.02,0.15),mid=vec3(0.23,0.09,0.56),hi=vec3(0.56,0.36,1.0);
  vec3 col=mix(dark,mid,smoothstep(0.0,0.55,L));
  col=mix(col,hi,smoothstep(0.55,1.0,L)*0.75);
  col+=rim*vec3(0.9,0.25,0.95)*0.2;
  col*=mix(0.3,1.0,smoothstep(uTop-0.04,uTop+0.28,Y));
  col*=1.0-0.4*smoothstep(uFloor-0.32,uFloor,Y);
  vec2 sp=vec2((X-uSpotX)*uRes.x/uRes.y,(Y-uSpotY)*1.3);
  float spot=exp(-dot(sp,sp)/0.05)*uSpot;
  col+=spot*vec3(0.75,0.85,0.45)*(0.2+0.6*L);
  col*=mix(0.5,1.0,smoothstep(0.0,30.0,d));
  col+=(hash(floor(fc/px))-0.5)*0.04;
  col*=0.92+0.08*hash(vec2(floor(u*NF*36.0)+side*91.0,3.0));

  /* ネオンの縁取り（内側の端・裾） */
  vec3 trim=vec3(0.776,1.0,0.0)*(0.42+0.6*L)+vec3(0.15)*rim;
  col=mix(col,trim,1.0-smoothstep(4.5,6.0,d));
  col=mix(col,trim*0.92,(1.0-smoothstep(11.0,12.5,dy))*step(0.0,dy));

  /* 房飾り（フリンジ） */
  float a=ah*step(0.0,dy);
  if(dy<0.0&&dy>-12.0){
    float strand=step(0.42,fract(fc.x/(3.0*px)+floor(fc.x/(3.0*px))*0.13));
    a=ah*strand*clamp(1.0+dy/12.0+0.35,0.0,1.0);
    col=vec3(0.6,0.8,0.0)*(0.6+0.4*L);
  }
  gl_FragColor=vec4(col*a,a+(1.0-a)*sh);
}`;

  let gl = null, prog = null, U = {};
  function initGL() {
    try {
      gl = glCanvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, powerPreference: 'high-performance' });
    } catch (e) { gl = null; }
    if (!gl) return false;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) {
      console.warn('[stage] WebGL curtain disabled:', e);
      gl = null;
      return false;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['uRes', 'uTime', 'uOpen', 'uSway', 'uFloor', 'uTop', 'uPeek', 'uPeekY', 'uPeekH', 'uPeekW', 'uOpenW', 'uSpotX', 'uSpotY', 'uSpot', 'uDpr']
      .forEach((n) => (U[n] = gl.getUniformLocation(prog, n)));
    glCanvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); pin.classList.add('no-gl'); gl = null; });
    return true;
  }
  const glOK = !reduce && initGL();
  if (!glOK) pin.classList.add('no-gl');

  // JS側でも同じ式でカーテンの端を計算（DACOが端を押す位置合わせ用）
  function edgeAt(Y, open) {
    const eo = (mix(0.125, 0.072, Y) - 0.03 * Math.exp(-Math.pow((Y - 0.66) / 0.09, 2))) * M.openW;
    return mix(0.4985, eo, open);
  }

  /* ------------------------------------------------------------
     レイアウト計測
     ------------------------------------------------------------ */
  const M = {};
  const STAND_RATIO = 337 / 577;   // 立ち絵 幅/高さ
  const PEACE_H = 1.5 * (811 / 720); // ピース画像の高さ（立ち絵の幅 aw に対する倍率）
  function layout() {
    const W = pin.clientWidth, H = pin.clientHeight;
    const portrait = W <= 760 && W / H < 1;
    M.W = W; M.H = H; M.portrait = portrait;
    M.floorY = H - floorEl.offsetHeight;
    M.top = valance.offsetHeight / H;
    M.openW = portrait ? 0.5 : 1;
    const standH = portrait ? Math.min(H * 0.3, 300) : Math.min(H * 0.42, 440);
    M.aw = standH * STAND_RATIO;
    M.h = standH;
    actor.style.setProperty('--aw', M.aw + 'px');
    M.y0 = M.floorY - M.h * 0.965;
    M.cx0 = W / 2;
    // ピース（最終ポーズ）
    if (portrait) {
      const heroBottom = hero.offsetTop + hero.offsetHeight;
      const avail = H - heroBottom - 4;
      const peaceH = clamp(avail, H * 0.17, H * 0.4);
      M.finalBubble = avail > H * 0.24;
      M.sF = peaceH / (M.aw * PEACE_H);
      M.cxF = W * 0.5;
    } else {
      M.sF = (H * 0.6) / (M.aw * PEACE_H);
      M.cxF = W * 0.735;
      M.finalBubble = true;
    }
    M.yF = H + 4 - M.h;

    // 布は柔らかい質感なので解像度を抑えても見た目はほぼ同じ → GPU負荷を大きく削減
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    M.dpr = dpr;
    M.fxDpr = Math.min(window.devicePixelRatio || 1, portrait ? 1 : 1.5);
    needGL = true;
    if (gl) {
      glCanvas.width = Math.round(W * dpr);
      glCanvas.height = Math.round(H * dpr);
      gl.viewport(0, 0, glCanvas.width, glCanvas.height);
    }
    fxCanvas.width = Math.round(W * M.fxDpr);
    fxCanvas.height = Math.round(H * M.fxDpr);
    bubbleW = 0;
  }

  /* ------------------------------------------------------------
     吹き出し
     ------------------------------------------------------------ */
  let lastBubble = null, bubbleW = 0, bubbleH = 0;
  function setBubble(key, left) {
    if (reduce) return;
    if (key === lastBubble) return;
    lastBubble = key;
    bubble.classList.remove('is-on');
    clearTimeout(setBubble.tm);
    if (!key) return;
    setBubble.tm = setTimeout(() => {
      bubble.innerHTML = t18(key);
      bubble.classList.toggle('is-left', !!left);
      bubbleW = bubble.offsetWidth; bubbleH = bubble.offsetHeight;
      bubble.classList.add('is-on');
    }, 120);
  }

  /* ------------------------------------------------------------
     エフェクト（キラキラ・紙吹雪）
     ------------------------------------------------------------ */
  const fx = fxCanvas.getContext('2d');
  const parts = [];
  let fxDirty = false;
  const COLORS = ['#c6ff00', '#7a3cff', '#ff4dff', '#ffffff', '#b26dff'];
  function burstSparkles(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 7;
      parts.push({ k: 's', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2.5, life: 1, decay: 0.012 + Math.random() * 0.018, size: 5 + Math.random() * 10, c: COLORS[i % COLORS.length], rot: Math.random() * 6 });
    }
  }
  function confetti(n) {
    for (let i = 0; i < n; i++) {
      const fromLeft = i % 2 === 0;
      parts.push({ k: 'c', x: fromLeft ? M.W * (0.08 + Math.random() * 0.1) : M.W * (0.82 + Math.random() * 0.1), y: M.H * (M.top + Math.random() * 0.05),
        vx: (fromLeft ? 1 : -1) * (2 + Math.random() * 7), vy: -3 - Math.random() * 6, life: 1, decay: 0.007 + Math.random() * 0.005,
        w: 6 + Math.random() * 6, h: 3 + Math.random() * 4, c: COLORS[i % COLORS.length], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3 });
    }
  }
  function drawFx() {
    const d = M.fxDpr;
    if (!parts.length && !fxDirty) return;
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
    fxDirty = parts.length > 0;
    if (!parts.length) return;
    fx.setTransform(d, 0, 0, d, 0, 0);
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.x += q.vx; q.y += q.vy; q.life -= q.decay;
      if (q.k === 's') { q.vx *= 0.95; q.vy = q.vy * 0.95 + 0.12; }
      else { q.vx *= 0.985; q.vy = Math.min(q.vy + 0.16, 3.2); q.rot += q.vr; q.x += Math.sin(q.life * 20 + i) * 0.6; }
      if (q.life <= 0 || q.y > M.H + 20) { parts.splice(i, 1); continue; }
      fx.globalAlpha = Math.min(1, q.life * 1.6);
      fx.fillStyle = q.c;
      fx.save();
      fx.translate(q.x, q.y);
      fx.rotate(q.rot);
      if (q.k === 's') {
        const r = q.size * (0.4 + q.life * 0.6);
        fx.shadowColor = q.c; fx.shadowBlur = 10;
        fx.beginPath();
        fx.moveTo(0, -r); fx.quadraticCurveTo(0, 0, r, 0); fx.quadraticCurveTo(0, 0, 0, r);
        fx.quadraticCurveTo(0, 0, -r, 0); fx.quadraticCurveTo(0, 0, 0, -r);
        fx.fill();
      } else {
        fx.scale(1, Math.cos(q.life * 30 + i));
        fx.fillRect(-q.w / 2, -q.h / 2, q.w, q.h);
      }
      fx.restore();
    }
    fx.globalAlpha = 1;
  }

  /* ------------------------------------------------------------
     スクロール → 演出
     ------------------------------------------------------------ */
  let pRaw = 0, p = 0, pPrev = 0, sway = 0, time = 0, travelled = 0, lastX = null;
  let firedConfetti = false, firedSwap = false, needGL = true, lastGL = -1;
  let mouseX = 0, mouseY = 0, mx = 0, my = 0;

  function readScroll() {
    const r = stage.getBoundingClientRect();
    const span = stage.offsetHeight - pin.offsetHeight;
    pRaw = span > 0 ? clamp(-r.top / span) : 1;
  }

  function render(force) {
    const W = M.W, H = M.H;
    const vel = p - pPrev;
    pPrev = p;
    sway = mix(sway, clamp(vel * 60, -1, 1), 0.08);

    // ---- 区間ごとの進み具合
    const a = seg(p, 0.0, 0.1);              // 飛び出す
    const b = seg(p, 0.1, 0.58);             // 幕を開ける
    const c = seg(p, 0.58, 0.74);            // ジャンプ＆変身
    const q = seg(p, 0.4, 0.88);             // コピーの登場
    const open = easeInOut(b);

    pin.style.setProperty('--open', open.toFixed(3));
    pin.style.setProperty('--hint', (1 - seg(p, 0.0, 0.05)).toFixed(3));

    // ---- DACO の位置
    const idle = Math.sin(time * 2.2);
    let cx, y, s = 1, rot = 0, clip = 0, peekAmt = 0;
    const peekClip = 0.5;
    if (a < 1) {
      // 隙間から顔だけ → 全身が出てくる
      const pop = easeOut(a);
      clip = peekClip * (1 - seg(a, 0.0, 0.55));
      peekAmt = 1 - seg(a, 0.0, 0.7);
      cx = M.cx0 + (1 - pop) * idle * 3;
      y = M.y0 - Math.sin(Math.PI * a) * M.h * 0.18;
      s = mix(0.94, 1, pop);
      rot = mix(-5 + idle * 2.5, 0, pop);
    } else {
      cx = M.cx0; y = M.y0;
    }
    if (b > 0) {
      // 右カーテンの端に合わせて歩く（押している感じ）
      const hipY = (M.y0 + M.h * 0.6) / H;
      const edgeX = W * (1 - edgeAt(hipY, open)) - M.aw * 0.42;
      const follow = easeInOut(seg(b, 0, 0.18));
      cx = mix(M.cx0, edgeX, follow);
      if (lastX != null) travelled += Math.abs(cx - lastX);
      const step = travelled / (M.aw * 0.55);
      y = M.y0 - Math.abs(Math.sin(step * Math.PI)) * M.h * 0.05 * (b < 1 ? 1 : 0);
      rot = clamp(sway * 14, -9, 9) + Math.sin(step * Math.PI) * 3 * (b < 1 ? 1 : 0);
    }
    lastX = cx;
    let peace = 0;
    if (c > 0) {
      // ジャンプして最終位置へ。頂点でピースのポーズに変身
      const hipY = (M.y0 + M.h * 0.6) / H;
      const startX = W * (1 - edgeAt(hipY, 1)) - M.aw * 0.42;
      const k = easeInOut(c);
      cx = mix(startX, M.cxF, k);
      const yLine = mix(M.y0, M.yF, k);
      y = yLine - Math.sin(Math.PI * c) * H * 0.2;
      s = mix(1, M.sF, easeOut(c));
      rot = Math.sin(Math.PI * c) * -10;
      peace = seg(c, 0.38, 0.62);
    }
    // 最終ポーズのゆらぎはCSSアニメーションに任せる（JSの毎フレーム処理を止められる）
    actor.classList.toggle('is-final', c >= 1);
    const x = cx - M.aw / 2;
    actor.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) scale(${s.toFixed(4)})`;
    actorBody.style.transform = `rotate(${rot.toFixed(2)}deg)`;
    // 顔だけ出している間は、体をふわっと消してカーテンの奥にいるように見せる
    const stand = actorBody.firstElementChild;
    const mask = clip > 0.001
      ? `linear-gradient(#000 ${(100 - clip * 100 - 9).toFixed(1)}%, transparent ${(100 - clip * 100).toFixed(1)}%)`
      : 'none';
    stand.style.webkitMaskImage = stand.style.maskImage = mask;
    actor.style.setProperty('--peace', peace.toFixed(3));
    actor.style.setProperty('--peace-s', mix(0.6, 1, backOut(peace)).toFixed(3));
    actor.style.setProperty('--spot', (Math.min(a * a, 1 - c)).toFixed(3));

    // 変身のキラキラ・幕が開ききった瞬間の紙吹雪（下に進む時だけ）
    if (!firedSwap && c > 0.45 && vel >= 0) {
      firedSwap = true;
      burstSparkles(cx, y + M.h - M.h * s * 0.55, 46);
    }
    if (c < 0.2) firedSwap = false;
    if (!firedConfetti && b > 0.97 && vel >= 0) { firedConfetti = true; confetti(M.portrait ? 50 : 110); }
    if (b < 0.6) firedConfetti = false;

    // ---- 吹き出し
    let key = null, left = false;
    if (p < 0.035) key = 'stage.b1';
    else if (p < 0.13) key = 'stage.b2';
    else if (b > 0.12 && b < 0.85) { key = 'stage.b3'; left = true; }
    else if (c >= 1 && q > 0.75 && M.finalBubble) key = 'stage.b4';
    setBubble(key, left);
    if (bubble.classList.contains('is-on')) {
      const boxTop = y + M.h - M.h * s;           // 拡大後の頭の上
      const headX = cx + (left ? -1 : 1) * M.aw * s * (peace > 0.5 ? 0.18 : 0.12);
      let bx = left ? headX - bubbleW : headX;
      let by = boxTop + (clip > 0 ? M.h * 0.0 : M.h * s * (peace > 0.5 ? 0.1 : 0.02)) - bubbleH - 6;
      if (M.portrait && peace > 0.5) { bx = cx + M.aw * s * 0.3; by = boxTop + M.h * s * 0.15 - bubbleH; }
      bx = clamp(bx, 10, W - bubbleW - 10);
      by = clamp(by, M.top * H + 6, H - bubbleH - 10);
      bubble.style.translate = `${bx.toFixed(1)}px ${by.toFixed(1)}px`;
    }

    // ---- 観客のハムスター：幕が開くにつれて立ち上がり、開ききったら跳ねて喜ぶ
    pin.style.setProperty('--rise', easeOut(seg(p, 0.08, 0.5)).toFixed(3));
    crowd.classList.toggle('is-cheer', b > 0.95);

    // ---- 奥のコピー（順番に浮かび上がる）
    heroItems.forEach((el, i) => {
      const v = easeOut(seg(q, i * 0.075, i * 0.075 + 0.38));
      if (el._v === v) return;   // 変化が無ければスタイルを書き換えない
      el._v = v;
      el.style.opacity = v.toFixed(3);
      el.style.transform = v >= 1 ? 'none' : `translate3d(0,${((1 - v) * 34).toFixed(1)}px,0)`;
      el.style.pointerEvents = v > 0.5 ? 'auto' : 'none';
    });

    // ---- ポスター（奥から飛んでくる＋マウスでパララックス）
    mx = mix(mx, mouseX, 0.06); my = mix(my, mouseY, 0.06);
    posters.forEach(({ el, L }, i) => {
      const v = easeOut(seg(q, 0.25 + i * 0.1, 0.65 + i * 0.1));
      const fl = Math.sin(time * 0.8 + i * 1.7) * 8;
      el.style.opacity = (v * (0.5 + L.d * 0.5)).toFixed(3);
      el.style.transform = `translate3d(${(mx * L.d * -30).toFixed(1)}px,${(my * L.d * -20 + fl + (1 - v) * 80).toFixed(1)}px,0) rotate(${L.r + (1 - v) * 18}deg) scale(${(0.7 + v * 0.3).toFixed(3)})`;
    });
    // 舞台全体を少しだけマウス方向へ
    $('.stage__back', pin).style.transform = `translate3d(${(mx * -8).toFixed(1)}px,${(my * -6).toFixed(1)}px,0) scale(${(1.04 - open * 0.04).toFixed(3)})`;

    // ---- ナビは開演まで隠す（シアターモード）
    const inStage = stage.getBoundingClientRect().bottom > H * 0.5;
    nav.classList.toggle('is-hidden', inStage && p < 0.86);

    // ---- カーテン描画（変化がある時だけ。幕が開ききって止まっている間は描かない）
    const moving = Math.abs(vel) > 1e-5 || Math.abs(sway) > 0.002;
    const glDue = needGL || moving || (open < 0.999 && time - lastGL > 1 / 30);
    if (gl && glDue) {
      needGL = false;
      lastGL = time;
      gl.uniform2f(U.uRes, glCanvas.width, glCanvas.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uOpen, open);
      gl.uniform1f(U.uSway, sway);
      gl.uniform1f(U.uFloor, M.floorY / H + 0.012);
      gl.uniform1f(U.uTop, M.top);
      gl.uniform1f(U.uPeek, peekAmt);
      gl.uniform1f(U.uPeekY, (M.y0 + M.h * 0.24) / H);
      gl.uniform1f(U.uPeekH, (M.h * 0.17) / H);
      gl.uniform1f(U.uPeekW, (M.aw * 0.4) / W);
      gl.uniform1f(U.uOpenW, M.openW);
      gl.uniform1f(U.uSpotX, cx / W);
      gl.uniform1f(U.uSpotY, (M.y0 + M.h * 0.5) / H);
      gl.uniform1f(U.uSpot, 1 - open);
      gl.uniform1f(U.uDpr, M.dpr);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    drawFx();
  }

  /* ------------------------------------------------------------
     ループ（舞台が見えている間だけ回す）
     ------------------------------------------------------------ */
  let visible = true, raf = 0, last = performance.now();
  let idleFor = 0;
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, (now - last) / 1000);
    readScroll();
    const settled = Math.abs(pRaw - p) < 0.0004 && !parts.length && Math.abs(mouseX - mx) + Math.abs(mouseY - my) < 0.002 && Math.abs(sway) < 0.002;
    idleFor = settled ? idleFor + dt : 0;
    // 止まっている間は30fpsに間引き、幕が開いた後に完全に止まったらループ自体を止める
    const throttle = idleFor > 0.4 && now - last < 30;
    if (!throttle) {
      last = now;
      time += dt;
      // 慣性をつけて追従（スマホでもヌルっと）
      p = Math.abs(pRaw - p) < 0.0004 ? pRaw : mix(p, pRaw, 1 - Math.pow(0.0015, dt));
      render();
    }
    const parked = idleFor > 0.6 && p > 0.76;
    if ((visible && !parked) || parts.length) raf = requestAnimationFrame(frame);
  }
  const start = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };

  if (reduce) {
    // 動きを減らす設定：幕は最初から開いた状態で静止
    layout();
    p = pRaw = 1; pPrev = 1;
    firedConfetti = firedSwap = true;
    render();
    nav.classList.remove('is-hidden');
    window.addEventListener('resize', () => { layout(); render(); });
  } else {
    layout();
    readScroll();
    p = pRaw; pPrev = p;
    render();
    new IntersectionObserver((ents) => {
      visible = ents[0].isIntersecting;
      if (!visible) { parts.length = 0; fxDirty = true; drawFx(); }   // 見えない所では演出を止める
      if (visible) start();
      else nav.classList.remove('is-hidden');
    }).observe(stage);
    start();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layout(); render(); }, 80); });
    window.addEventListener('scroll', start, { passive: true });
    if (finePointer) {
      window.addEventListener('mousemove', (e) => {
        mouseX = e.clientX / window.innerWidth - 0.5;
        mouseY = e.clientY / window.innerHeight - 0.5;
        if (visible) start();
      }, { passive: true });
    }
    // 画像の読み込み後にレイアウトを取り直す（ヒーローの高さが変わるため）
    window.addEventListener('load', () => { layout(); render(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); render(); });
  }

  /* ------------------------------------------------------------
     ページ全体の演出
     ------------------------------------------------------------ */
  // 上部の進捗バー
  const bar = document.createElement('div');
  bar.className = 'progress';
  document.body.appendChild(bar);
  const onProg = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? (window.scrollY / max).toFixed(4) : 0})`;
  };
  window.addEventListener('scroll', onProg, { passive: true });
  onProg();

  // カーソルのスポットライト（マウス環境のみ）
  if (finePointer && !reduce) {
    const spot = document.createElement('div');
    spot.className = 'cursor-spot';
    spot.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(spot, document.body.firstChild);
    let sx = innerWidth / 2, sy = innerHeight / 2, tx = sx, ty = sy, sraf = 0;
    const loop = () => {
      sx = mix(sx, tx, 0.12); sy = mix(sy, ty, 0.12);
      spot.style.transform = `translate3d(${sx.toFixed(1)}px,${sy.toFixed(1)}px,0)`;
      sraf = Math.abs(sx - tx) + Math.abs(sy - ty) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; if (!sraf) sraf = requestAnimationFrame(loop); }, { passive: true });
  }

  // ハイライトの数字カウントアップ
  const counters = document.querySelectorAll('.hl__num[data-count]');
  const cio = new IntersectionObserver((ents) => ents.forEach((e) => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = Number(el.dataset.to || el.textContent) || 0;
    if (reduce) { el.textContent = to; return; }
    const t0 = performance.now();
    const tick = (now) => {
      const k = easeOut(clamp((now - t0) / 1400));
      el.textContent = Math.round(to * k);
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: 0.6 });
  counters.forEach((c) => cio.observe(c));

  // 作品の動画をホバーで少し立体的に傾ける（マウス環境のみ）
  if (finePointer && !reduce) {
    document.addEventListener('mousemove', (e) => {
      const box = e.target.closest && e.target.closest('.work__media .yt:not(.yt--file), .gallery__main, .charsec__sheet');
      document.querySelectorAll('.is-tilting').forEach((el) => {
        if (el !== box) { el.classList.remove('is-tilting'); el.style.transform = ''; }
      });
      if (!box || box.querySelector('iframe')) return;
      const r = box.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      box.classList.add('is-tilting');
      box.style.transform = `perspective(900px) rotateY(${(px * 7).toFixed(2)}deg) rotateX(${(-py * 7).toFixed(2)}deg) translateY(-4px)`;
    }, { passive: true });
  }
})();
