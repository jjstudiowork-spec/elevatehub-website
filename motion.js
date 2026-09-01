const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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

initializeProgress();
initializeReveals();
initializeHeroParallax();
initializeMagneticButtons();
