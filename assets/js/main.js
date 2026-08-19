// ===== ナビ：スクロールで背景付与 =====
const nav = document.getElementById('nav');
const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ===== モバイルメニュー =====
const burger = document.getElementById('navBurger');
const links = document.getElementById('navLinks');
burger.addEventListener('click', () => {
  burger.classList.toggle('is-open');
  links.classList.toggle('is-open');
});
links.querySelectorAll('a').forEach(a =>
  a.addEventListener('click', () => {
    burger.classList.remove('is-open');
    links.classList.remove('is-open');
  })
);

// ===== スクロールリビール =====
const io = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('is-visible');
      io.unobserve(e.target);
    }
  }),
  { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
);
// 動的に追加した要素にも使えるよう公開
window.DacoReveal = (root = document) => {
  root.querySelectorAll('.reveal').forEach(el => io.observe(el));
};
window.DacoReveal();

// ===== YouTube クリック再生（軽量ファサード）=====
function bindYouTube(root = document) {
  root.querySelectorAll('.yt').forEach(box => {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    box.addEventListener('click', () => {
      if (box.querySelector('iframe')) return;
      const id = box.dataset.yt;
      if (!id) return;
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      iframe.title = box.dataset.title || 'YouTube video';
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      box.innerHTML = '';
      box.appendChild(iframe);
    });
  });
}

// ===== 複数動画の切り替え（作品ごとに独立）=====
function bindVideoNav(root = document) {
  root.querySelectorAll('.work__media--videos').forEach(box => {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    const player = box.querySelector('.yt');
    const items = box.querySelectorAll('.vidnav__item');
    if (!player || !items.length) return;
    const vertical = box.dataset.vertical === '1';
    const workTitle = box.dataset.worktitle || '';
    items.forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.classList.contains('is-active') && !player.querySelector('iframe')) return;
        const wasPlaying = !!player.querySelector('iframe');
        items.forEach(b => b.classList.toggle('is-active', b === btn));
        const v = { id: btn.dataset.yt, label: btn.dataset.label, thumb: btn.dataset.thumb };
        player.dataset.yt = v.id;
        player.dataset.title = v.label || workTitle;
        player.innerHTML = window.DacoWorks.facade(v, workTitle, vertical);
        // 再生中に切り替えたときは、そのまま次の動画を再生する
        if (wasPlaying) player.click();
      });
    });
  });
}

// ===== 画像ギャラリー切り替え（作品ごとに独立）=====
function bindGallery(root = document) {
  root.querySelectorAll('.work__media--gallery').forEach(box => {
    if (box.dataset.bound) return;
    box.dataset.bound = '1';
    const main = box.querySelector('.gallery__main img');
    const thumbs = box.querySelectorAll('.gallery__thumb');
    if (!main || !thumbs.length) return;
    thumbs.forEach(btn => {
      btn.addEventListener('click', () => {
        thumbs.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        main.style.opacity = '0';
        setTimeout(() => {
          main.src = btn.dataset.src;
          main.style.opacity = '1';
        }, 180);
      });
    });
  });
}

// 動的描画後の再バインド用に公開
window.DacoBind = (root = document) => {
  bindYouTube(root);
  bindVideoNav(root);
  bindGallery(root);
};
window.DacoBind();
