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
const aboutCards = [
  {
    icon: '🖥️',
    title: 'HomeLAB Infrastructure',
    desc: 'Wykorzystujemy PC (Intel i5-11400F, Xeon E5-2690) i Cloud VPS. Łatwa konfiguracja i zdalne zarządzanie.',
  },
  {
    icon: '📊',
    title: 'Monitoring & Kontrola',
    desc: 'Monitorowanie zasobów i pełna kontrola. Planowany stack: Grafana, Prometheus.',
  },
  {
    icon: '🔓',
    title: 'Open-Source First',
    desc: 'Wszystko na własnych maszynach z open-source. Pełna kontrola nad danymi i bezpieczeństwem.',
  },
];

const services = [
  {
    name: 'Discord Server',
    desc: 'Serwer Discord dla społeczności z botami, eventami i aktywnymi kanałami.',
    color: '#5865F2',
    link: CONFIG.discord,
    linkText: 'Dołącz →',
  },
  {
    name: 'Minecraft Server',
    desc: 'Dynamiczny self-host paczek modyfikacji. Hosting 24/7 na Primary Node (i5-11400F).',
    color: '#62A87C',
    address: 'mc.chomiczanora.pl',
  },
  {
    name: 'Teamspeak Server',
    desc: 'Komunikacja głosowa dla społeczności. Self-hosted na infrastrukturze Maszynownia.',
    color: '#FF9500',
    address: 'ts.chomiczanora.pl',
  },
  {
    name: 'Wsparcie Ko-fi',
    desc: 'Wspieraj rozwój projektu i otrzymuj dodatkowe rangi oraz kosmetyki.',
    color: '#13C3A4',
    link: CONFIG.kofi,
    linkText: 'Wesprzyj →',
  },
];

const statusItems = [
  { name: 'Discord Bot',       endpoint: null, fallback: 'online' },
  { name: 'Minecraft Server',  endpoint: null, fallback: 'online' },
  { name: 'Teamspeak Server',  endpoint: null, fallback: 'online' },
];

const faqItems = [
  {
    q: 'Czym jest Projekt Maszynownia?',
    a: 'Maszynownia to HomeLAB oparty o własne serwery fizyczne i VPS. Hostujemy usługi dla społeczności — Discord, Minecraft, Teamspeak i planujemy kolejne.',
  },
  {
    q: 'Jak dołączyć do społeczności?',
    a: 'Najłatwiej przez Discord! Kliknij przycisk „Dołącz na Discord" na górze strony i zostaniesz od razu dodany do naszego serwera.',
  },
  {
    q: 'Ile kosztuje korzystanie z usług?',
    a: 'Wszystkie podstawowe usługi są całkowicie darmowe. Możesz nas wesprzeć przez Ko-fi, za co otrzymasz dodatkowe rangi i kosmetyki.',
  },
  {
    q: 'Na jakim sprzęcie działają serwery?',
    a: 'Primary Node to Intel i5-11400F, Secondary Node to Xeon E5-2690. Korzystamy też z Cloud VPS dla krytycznych usług wymagających wysokiej dostępności.',
  },
  {
    q: 'Czy mogę zaproponować nowy serwis?',
    a: 'Oczywiście! Najlepiej napisz na kanale #propozycje na Discordzie. Sponsorzy mają dodatkowe prawo głosu w wyborze nowych funkcji.',
  },
];

const sponsorBenefits = [
  '<strong>Rangę Sponsor</strong> widoczną w TAB i na czacie serwera',
  '<strong>Kolorowe wiadomości</strong> na czacie (bez koloru czerwonego)',
  '<strong>Dodatki kosmetyczne</strong> nie ingerujące w ekonomię',
  '<strong>Wpływ na rozwój</strong> — głosowanie na nowe funkcje',
  '<strong>Ekskluzywne kanały</strong> na Discord dla sponsorów',
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
function renderAbout() {
  const grid = $('#about-grid');
  if (!grid) return;
  for (const card of aboutCards) {
    grid.append(
      el('div', { class: 'card reveal' }, [
        el('div', { class: 'card-icon', text: card.icon }),
        el('h3', { text: card.title }),
        el('p', { text: card.desc }),
      ])
    );
  }
}

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
          class: 'card-link',
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
    const card = el('div', {
      class: 'card reveal',
      style: { '--accent': s.color, borderLeft: `4px solid ${s.color}` },
    }, body);
    grid.append(card);
  }
}

function renderStatus() {
  const grid = $('#status-grid');
  if (!grid) return;
  for (const item of statusItems) {
    const dotClass = `status-dot status-dot--${item.fallback || 'loading'}`;
    grid.append(
      el('div', { class: 'status-card reveal' }, [
        el('span', { class: dotClass }),
        el('span', { class: 'status-name', text: item.name }),
        el('span', { class: 'status-info', text: item.fallback === 'online' ? 'Dostępny' : 'Sprawdzam...' }),
      ])
    );
  }
}

function renderFAQ() {
  const list = $('#faq-list');
  if (!list) return;
  for (const item of faqItems) {
    const chevron = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>';
    const accItem = el('div', { class: 'accordion-item reveal' }, [
      el('button', {
        class: 'accordion-btn',
        'aria-expanded': 'false',
        html: `<span>${item.q}</span>${chevron}`,
      }),
      el('div', { class: 'accordion-body' }, [
        el('div', { class: 'accordion-body-inner', text: item.a }),
      ]),
    ]);
    const btn = accItem.querySelector('.accordion-btn');
    btn.addEventListener('click', () => toggleAccordion(accItem));
    list.append(accItem);
  }
}

function renderBenefits() {
  const list = $('#benefit-list');
  if (!list) return;
  for (const b of sponsorBenefits) {
    list.append(el('li', { html: b }));
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
  renderAbout();
  renderServices();
  renderStatus();
  renderFAQ();
  renderBenefits();
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
