const hasMotion = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const canUseGsap = hasMotion && window.gsap && window.ScrollTrigger;
let lenis = null;

function startHero() {
  if (!canUseGsap) return;
  const timeline = gsap.timeline({ defaults: { ease: 'expo.out' } });
  timeline
    .fromTo('#heroFilm', { scale: 1.05, borderRadius: '0px' }, { scale: 1, borderRadius: window.innerWidth <= 768 ? '12px' : '28px', duration: 1.35 }, 0)
    .fromTo('#heroVid', { scale: 1.12 }, { scale: 1, duration: 1.8 }, 0)
    .fromTo('#heroEyebrow', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .75 }, .38)
    .fromTo('#line1', { y: '110%' }, { y: '0%', duration: .9 }, .46)
    .fromTo('#line2', { y: '110%' }, { y: '0%', duration: .9 }, .58)
    .fromTo('#heroSub', { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: .75 }, .78)
    .fromTo('#heroCta', { opacity: 0, x: -18 }, { opacity: 1, x: 0, duration: .7 }, .9)
    .fromTo('#heroBadge', { opacity: 0, scale: .72 }, { opacity: 1, scale: 1, duration: .75 }, 1)
    .fromTo('#scrollHint', { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: .7 }, 1.1)
    .fromTo('#mainNav', { y: -26, opacity: 0 }, { y: 0, opacity: 1, duration: .8 }, 1);
}

function initializePreloader() {
  if (!hasMotion) { startHero(); return; }
  const counter = document.getElementById('pre-counter');
  const fill = document.getElementById('pre-bar-fill');
  const brand = document.getElementById('pre-brand');
  const content = document.getElementById('pre-content');
  const top = document.querySelector('.pre-panel.top');
  const bottom = document.querySelector('.pre-panel.bottom');
  const started = performance.now();
  const duration = 950;
  const tick = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    counter.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    fill.style.width = `${eased * 100}%`;
    brand.style.color = `rgba(255,255,255,${eased * .58})`;
    if (progress < 1) return requestAnimationFrame(tick);
    if (!canUseGsap) { document.body.classList.add('no-gsap'); document.getElementById('preloader').remove(); content.remove(); return; }
    gsap.timeline({ onComplete: () => { content.remove(); document.getElementById('preloader')?.remove(); startHero(); } })
      .to(content, { opacity: 0, duration: .32, ease: 'power2.in' }, 0)
      .to(top, { yPercent: -100, duration: .95, ease: 'expo.inOut' }, .12)
      .to(bottom, { yPercent: 100, duration: .95, ease: 'expo.inOut' }, .12);
  };
  requestAnimationFrame(tick);
}

function initializeSmoothScroll() {
  if (!hasMotion || !window.Lenis || !canUseGsap) return;
  lenis = new Lenis({ lerp: .085, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.on('scroll', ({ progress }) => { document.getElementById('progress-bar').style.transform = `scaleX(${progress})`; });
}

function initializeCursor() {
  if (!hasMotion || !window.matchMedia('(pointer: fine)').matches) return;
  const dot = document.getElementById('cur-dot');
  const ring = document.getElementById('cur-ring');
  let mouseX = -100, mouseY = -100, ringX = -100, ringY = -100;
  document.addEventListener('mousemove', (event) => { mouseX = event.clientX; mouseY = event.clientY; });
  const render = () => {
    dot.style.left = `${mouseX}px`; dot.style.top = `${mouseY}px`;
    ringX += (mouseX - ringX) * .1; ringY += (mouseY - ringY) * .1;
    ring.style.left = `${ringX}px`; ring.style.top = `${ringY}px`;
    requestAnimationFrame(render);
  };
  requestAnimationFrame(render);
  document.querySelectorAll('a,button,.p-card').forEach((item) => {
    item.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
    item.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
  });
}

function initializeMagnetic() {
  if (!canUseGsap || !window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.magnetic').forEach((item) => {
    item.addEventListener('mousemove', (event) => {
      const rect = item.getBoundingClientRect();
      gsap.to(item, { x: (event.clientX - rect.left - rect.width / 2) * .22, y: (event.clientY - rect.top - rect.height / 2) * .22, duration: .35, ease: 'power2.out' });
    });
    item.addEventListener('mouseleave', () => gsap.to(item, { x: 0, y: 0, duration: .55, ease: 'elastic.out(1,.45)' }));
  });
}

function initializeScrollScenes() {
  if (!canUseGsap) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.create({ start: 'top -60', onUpdate: (self) => document.getElementById('mainNav').classList.toggle('scrolled', self.scroll() > 60) });
  gsap.to('#heroVid', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '.hero-outer', scrub: true, start: 'top top', end: 'bottom top' } });
  gsap.to('#heroFilm', { scale: .95, borderRadius: '52px', ease: 'none', scrollTrigger: { trigger: '.hero-outer', scrub: true, start: '30% top', end: 'bottom top' } });

  if (window.innerWidth > 768) {
    const track = document.getElementById('shopTrack');
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth + 120);
    gsap.to(track, { x: () => -distance(), ease: 'none', scrollTrigger: { trigger: '#suite', pin: '#shopPin', scrub: 1.1, start: 'top top', end: () => `+=${distance() + window.innerWidth * .25}`, invalidateOnRefresh: true, onUpdate: () => document.querySelectorAll('.p-card').forEach((card) => { if (card.getBoundingClientRect().left < window.innerWidth - 70) card.classList.add('revealed'); }) } });
  } else {
    document.querySelectorAll('.p-card').forEach((card) => card.classList.add('revealed'));
  }

  const copy = 'ElevateHub exists for the people behind the screens. Every view every control every connection is designed to reduce friction and protect focus when the room is live.';
  const gold = new Set(['ElevateHub', 'screens.', 'connection', 'focus', 'live.']);
  const manifesto = document.getElementById('manifestoText');
  manifesto.innerHTML = copy.split(' ').map((word) => `<span class="mw${gold.has(word) ? ' gold-lit' : ''}">${word}</span>`).join(' ');
  const words = [...document.querySelectorAll('.mw')];
  ScrollTrigger.create({ trigger: '#manifesto', start: 'top 80%', end: 'bottom 30%', scrub: .5, onUpdate: (self) => { const amount = Math.floor(self.progress * words.length); words.forEach((word, index) => word.classList.toggle('lit', index < amount)); } });

  document.querySelectorAll('.stat-num').forEach((element) => ScrollTrigger.create({ trigger: element, start: 'top 85%', once: true, onEnter: () => { const state = { value: 0 }; gsap.to(state, { value: Number(element.dataset.target), duration: 1.5, ease: 'power2.out', onUpdate: () => { const raw = String(Math.round(state.value)).padStart(Number(element.dataset.pad || 0), '0'); element.textContent = `${raw}${element.dataset.suffix || ''}`; } }); } }));
  ScrollTrigger.create({ trigger: '.production-feature-media', start: 'top 72%', onEnter: () => document.querySelector('.production-feature-media').classList.add('in-view') });
  gsap.from('.production-feature-copy > *', { y: 35, opacity: 0, stagger: .09, duration: .8, ease: 'expo.out', scrollTrigger: { trigger: '.production-feature-copy', start: 'top 76%' } });
  gsap.from('.stream-deck-callout > *', { y: 45, opacity: 0, stagger: .14, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.stream-deck-callout', start: 'top 75%' } });
  gsap.from('footer > *', { y: 40, opacity: 0, stagger: .1, duration: .9, ease: 'expo.out', scrollTrigger: { trigger: 'footer', start: 'top 84%' } });
}

function initializeScramble() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  document.querySelectorAll('[data-scramble]').forEach((item) => {
    const original = item.textContent;
    item.addEventListener('mouseenter', () => { let iteration = 0; const timer = setInterval(() => { item.textContent = [...original].map((char, index) => index < iteration ? original[index] : chars[Math.floor(Math.random() * chars.length)]).join(''); iteration += 1; if (iteration > original.length) clearInterval(timer); }, 42); });
  });
}

function toggleMenu() {
  const menu = document.getElementById('fullMenu');
  const active = menu.classList.toggle('active');
  menu.setAttribute('aria-hidden', String(!active));
  if (active) lenis?.stop(); else lenis?.start();
}
window.toggleMenu = toggleMenu;

initializeSmoothScroll();
initializeMagnetic();
initializeScrollScenes();
initializeScramble();
initializePreloader();
