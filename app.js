// ============================================
// Chomicza Nora — Projekt Maszynownia
// Clean vanilla JavaScript
// ============================================

'use strict';

// ---------- Config ----------
const CONFIG = {
  discord:       'https://discord.com/invite/ChTAqW8yDv',
  kofi:          'https://ko-fi.com/chomiczanora',
  discordWidget: '786844869699174401',
};

// ---------- Data ----------
const services = [
  {
    name: 'Discord Server',
    icon: '💬',
    desc: 'Centrum społeczności. Boty, eventy, aktywne kanały i zaprzyjaźnieni ludzie.',
    color: '#5865F2',
    link: CONFIG.discord,
    linkText: 'Dołącz →',
  },
  {
    name: 'Minecraft Server',
    icon: '⛏️',
    desc: 'Self-hosted serwer z modpackami (czasem bez 😂)',
    color: '#62A87C',
    address: 'mc.chomiczanora.pl',
  },
  {
    name: 'Teamspeak Server',
    icon: '🎙️',
    desc: 'Niskolatencyjny serwer głosowy. Self-hosted na infrastrukturze Maszynownia.',
    color: '#FF9500',
    address: 'ts.chomiczanora.pl',
  },
];

// ---------- DOM Helpers ----------
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'style' && typeof v === 'object') {
      Object.assign(node.style, v);
    } else if (k === 'dataset') {
      Object.assign(node.dataset, v);
    } else if (k === 'html') {
      node.innerHTML = v;
    } else if (k === 'text') {
      node.textContent = v;
    } else {
      node.setAttribute(k, v);
    }
  }
  for (const c of children) {
    node.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

// ---------- Renderers ----------
function renderServices() {
  const grid = $('#services-grid');
  if (!grid) return;
  for (const s of services) {
    const body = [
      el('h3', { text: s.name }),
      el('p', { text: s.desc }),
    ];
    if (s.link) {
      body.push(
        el('a', {
          href: s.link,
          target: '_blank',
          rel: 'noopener',
          class: 'service-tile__link',
          style: { color: s.color },
          text: s.linkText,
        })
      );
    }
    if (s.address) {
      const copyIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
      const addr = el('button', {
        class: 'card-address',
        style: { color: s.color },
        html: `${s.address} ${copyIcon}`,
      });
      addr.addEventListener('click', () => copyToClipboard(s.address));
      body.push(addr);
    }
    const tile = el('div', { class: 'service-tile reveal' }, [
      el('div', {
        class: 'service-tile__header',
        style: { background: `linear-gradient(135deg, ${s.color}ee, ${s.color}77)` },
      }, [
        el('span', { class: 'service-tile__icon', text: s.icon }),
      ]),
      el('div', { class: 'service-tile__body' }, body),
    ]);
    grid.append(tile);
  }
}

// ---------- Interactions ----------
function toggleAccordion(item) {
  const isOpen = item.classList.contains('is-open');
  // Close all
  $$('.accordion-item.is-open').forEach(i => {
    i.classList.remove('is-open');
    i.querySelector('.accordion-btn').setAttribute('aria-expanded', 'false');
    i.querySelector('.accordion-body').style.maxHeight = null;
  });
  // Toggle current
  if (!isOpen) {
    item.classList.add('is-open');
    item.querySelector('.accordion-btn').setAttribute('aria-expanded', 'true');
    const body = item.querySelector('.accordion-body');
    body.style.maxHeight = body.scrollHeight + 'px';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`Skopiowano: ${text}`);
  }).catch(() => {
    // Fallback
    const ta = el('textarea', { text });
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.append(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    showToast(`Skopiowano: ${text}`);
  });
}

function showToast(msg) {
  const existing = $('.toast');
  if (existing) existing.remove();
  const toast = el('div', {
    class: 'toast',
    text: msg,
    style: {
      position: 'fixed',
      bottom: '2rem',
      left: '50%',
      transform: 'translateX(-50%) translateY(12px)',
      background: '#1a1a2e',
      color: '#fff',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      fontSize: '0.9rem',
      fontWeight: '500',
      zIndex: '9999',
      opacity: '0',
      transition: 'all 0.3s ease',
      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
    },
  });
  document.body.append(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(12px)';
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ---------- Navigation ----------
function initNav() {
  const toggle = $('.nav-toggle');
  const nav = $('#main-nav');
  if (!toggle || !nav) return;

  // Create overlay
  const overlay = el('div', { class: 'nav-overlay' });
  document.body.append(overlay);

  function closeNav() {
    nav.classList.remove('is-open');
    overlay.classList.remove('is-active');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  function openNav() {
    nav.classList.add('is-open');
    overlay.classList.add('is-active');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  toggle.addEventListener('click', () => {
    nav.classList.contains('is-open') ? closeNav() : openNav();
  });

  overlay.addEventListener('click', closeNav);

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeNav();
  });

  // Close on link click
  $$('a', nav).forEach(a => {
    a.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeNav();
    });
  });

  // Close on ESC
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeNav();
  });
}

// ---------- Header scroll effect ----------
function initHeaderScroll() {
  const header = $('.site-header');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ---------- Back to top ----------
function initBackToTop() {
  const btn = $('#backToTop');
  if (!btn) return;
  window.addEventListener('scroll', () => {
    btn.classList.toggle('is-visible', window.scrollY > 600);
  }, { passive: true });
}

// ---------- Scroll Reveal (IntersectionObserver) ----------
function initReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const delay = parseInt(entry.target.dataset.delay || '0', 10);
          setTimeout(() => entry.target.classList.add('is-visible'), delay);
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
  );
  $$('.reveal').forEach(el => observer.observe(el));
}

// ---------- Active nav highlight ----------
function initActiveNav() {
  const sections = $$('section[id]');
  const navLinks = $$('.main-nav a[href^="#"]');
  if (!sections.length || !navLinks.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const id = entry.target.id;
          navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
          });
        }
      });
    },
    { threshold: 0.3, rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 72}px 0px -40% 0px` }
  );
  sections.forEach(s => observer.observe(s));
}

// ---------- Init ----------
function init() {
  renderServices();
  initNav();
  initHeaderScroll();
  initBackToTop();
  initReveal();
  initActiveNav();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
