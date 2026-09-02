const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initializePreloader() {
  if (reducedMotion || sessionStorage.getItem('elevatehub-intro-seen')) return;
  document.body.classList.add('preloading');
  const loader = document.createElement('div');
  loader.className = 'motion-preloader';
  loader.innerHTML = '<div class="motion-preloader-panel"></div><div class="motion-preloader-panel"></div><div class="motion-preloader-content"><img src="elevatehub.png" alt=""><strong class="motion-preloader-count">000</strong><div class="motion-preloader-line"><i></i></div><span class="motion-preloader-label">PREPARING THE HUB</span></div>';
  document.body.append(loader);
  const count = loader.querySelector('.motion-preloader-count');
  const line = loader.querySelector('.motion-preloader-line i');
  const started = performance.now();
  const duration = 900;
  const tick = (now) => {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    count.textContent = String(Math.round(eased * 100)).padStart(3, '0');
    line.style.transform = `scaleX(${eased})`;
    if (progress < 1) return requestAnimationFrame(tick);
    sessionStorage.setItem('elevatehub-intro-seen', 'true');
    loader.classList.add('is-leaving');
    document.body.classList.remove('preloading');
    window.setTimeout(() => loader.remove(), 950);
  };
  requestAnimationFrame(tick);
}

function initializeCursor() {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
  const dot = document.createElement('span');
  const ring = document.createElement('span');
  dot.className = 'motion-cursor-dot';
  ring.className = 'motion-cursor-ring';
  document.body.append(dot, ring);
  let mouseX = -100, mouseY = -100, ringX = -100, ringY = -100, running = false;
  const render = () => {
    ringX += (mouseX - ringX) * .14;
    ringY += (mouseY - ringY) * .14;
    dot.style.transform = `translate3d(${mouseX - 2.5}px, ${mouseY - 2.5}px, 0)`;
    ring.style.transform = `translate3d(${ringX - ring.offsetWidth / 2}px, ${ringY - ring.offsetHeight / 2}px, 0)`;
    if (Math.abs(mouseX - ringX) + Math.abs(mouseY - ringY) > .2) requestAnimationFrame(render);
    else running = false;
  };
  window.addEventListener('pointermove', (event) => {
    mouseX = event.clientX; mouseY = event.clientY;
    document.body.classList.add('motion-cursor-active');
    if (!running) { running = true; requestAnimationFrame(render); }
  }, { passive: true });
  document.querySelectorAll('a,button,summary,input').forEach((item) => {
    item.addEventListener('pointerenter', () => document.body.classList.add('motion-cursor-hover'));
    item.addEventListener('pointerleave', () => document.body.classList.remove('motion-cursor-hover'));
  });
}

function initializePageTransitions() {
  if (reducedMotion) return;
  const wipe = document.createElement('div');
  wipe.className = 'page-wipe';
  document.body.append(wipe);
  document.querySelectorAll('a[href]').forEach((link) => link.addEventListener('click', (event) => {
    const url = new URL(link.href, window.location.href);
    if (url.origin !== window.location.origin || url.hash || link.hasAttribute('download') || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    wipe.classList.add('is-active');
    window.setTimeout(() => { window.location.href = url.href; }, 430);
  }));
}

function initializeProgress() {
  const progress = document.createElement('div');
  progress.className = 'site-progress';
  progress.setAttribute('aria-hidden', 'true');
  document.body.append(progress);

  let scheduled = false;
  const update = () => {
    const available = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${available > 0 ? window.scrollY / available : 0})`;
    document.querySelector('.site-header')?.classList.toggle('motion-scrolled', window.scrollY > 45);
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(update);
    }
  }, { passive: true });
  update();
}

function initializeReveals() {
  const groups = [
    '.section-intro', '.product-grid article', '.workspace-copy', '.workspace-visual',
    '.team-image', '.team-copy', '.deck-feature-copy', '.deck-feature-image',
    '.download-band > *', '.download-options article', '.install-columns > div',
    '.support-topics article', '.plugin-install', '.guide-heading', '.guide-steps li',
    '.support-note', '.deck-gallery figure', '.faq-list details', '.contact-band > *',
    '.release-card', '.download-help > *', '.site-footer > *'
  ];
  const items = document.querySelectorAll(groups.join(','));
  items.forEach((item, index) => {
    item.classList.add('motion-reveal');
    item.style.setProperty('--motion-delay', `${(index % 4) * 70}ms`);
  });
  document.querySelectorAll('.team-image,.deck-feature-image,.product-image').forEach((item) => item.classList.add('motion-image-reveal'));

  if (reducedMotion || !('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('motion-visible'));
    document.querySelectorAll('.motion-image-reveal').forEach((item) => item.classList.add('motion-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('motion-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: .12, rootMargin: '0px 0px -6% 0px' });
  items.forEach((item) => observer.observe(item));
  document.querySelectorAll('.motion-image-reveal').forEach((item) => observer.observe(item));
}

function initializeHeroParallax() {
  if (reducedMotion) return;
  const image = document.querySelector('.hero-media img');
  const hero = document.querySelector('.hero');
  if (!image || !hero) return;
  let scheduled = false;
  const update = () => {
    const rect = hero.getBoundingClientRect();
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      const progress = Math.min(1, Math.max(0, -rect.top / rect.height));
      image.style.transform = `scale(1.04) translate3d(0, ${progress * 34}px, 0)`;
    }
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }, { passive: true });
  update();
}

function initializeMagneticButtons() {
  if (reducedMotion || !window.matchMedia('(pointer: fine)').matches) return;
  document.querySelectorAll('.button').forEach((button) => {
    button.addEventListener('pointermove', (event) => {
      const rect = button.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      button.style.transform = `translate3d(${x * .09}px, ${y * .12}px, 0)`;
    });
    button.addEventListener('pointerleave', () => { button.style.transform = ''; });
  });

  const demo = document.querySelector('.timing-demo');
  demo?.addEventListener('pointermove', (event) => {
    const rect = demo.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    demo.style.transform = `perspective(900px) rotateX(${-y * 3}deg) rotateY(${x * 4}deg)`;
  });
  demo?.addEventListener('pointerleave', () => { demo.style.transform = ''; });
}

function initializeKineticText() {
  const text = document.querySelector('[data-kinetic-text]');
  if (!text) return;
  const words = text.textContent.trim().split(/\s+/);
  text.innerHTML = words.map((word) => `<span class="kinetic-word">${word}</span>`).join(' ');
  if (reducedMotion) {
    text.querySelectorAll('.kinetic-word').forEach((word) => word.classList.add('is-lit'));
    return;
  }
  const update = () => {
    const rect = text.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (window.innerHeight * .82 - rect.top) / (window.innerHeight * .62 + rect.height)));
    const lit = Math.ceil(progress * words.length);
    text.querySelectorAll('.kinetic-word').forEach((word, index) => word.classList.toggle('is-lit', index < lit));
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initializeWorkflowStory() {
  if (reducedMotion || window.innerWidth <= 820) return;
  const story = document.querySelector('.workflow-story');
  const track = document.querySelector('.workflow-story-track');
  if (!story || !track) return;
  let scheduled = false;
  const update = () => {
    const rect = story.getBoundingClientRect();
    const travel = Math.max(0, track.scrollWidth - window.innerWidth + 48);
    const range = Math.max(1, story.offsetHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, -rect.top / range));
    track.style.transform = `translate3d(${-travel * progress}px, 0, 0)`;
    scheduled = false;
  };
  window.addEventListener('scroll', () => {
    if (!scheduled) { scheduled = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

initializePreloader();
initializeProgress();
initializeReveals();
initializeHeroParallax();
initializeMagneticButtons();
initializeCursor();
initializePageTransitions();
initializeKineticText();
initializeWorkflowStory();
