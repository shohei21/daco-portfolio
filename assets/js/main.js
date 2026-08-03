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
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// ===== YouTube クリック再生（軽量ファサード）=====
document.querySelectorAll('.yt').forEach(box => {
  box.addEventListener('click', () => {
    if (box.querySelector('iframe')) return;
    const id = box.dataset.yt;
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
    iframe.title = box.dataset.title || 'YouTube video';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.allowFullscreen = true;
    box.innerHTML = '';
    box.appendChild(iframe);
  });
});

// ===== WORK04 ギャラリー切り替え =====
const galleryMain = document.getElementById('galleryMain');
document.querySelectorAll('.gallery__thumb').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.gallery__thumb').forEach(b => b.classList.remove('is-active'));
    btn.classList.add('is-active');
    galleryMain.style.opacity = '0';
    setTimeout(() => {
      galleryMain.src = btn.dataset.src;
      galleryMain.style.opacity = '1';
    }, 180);
  });
});
