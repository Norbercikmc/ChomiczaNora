// Chomicza Nora - Projekt Maszynownia
// Modern JavaScript Application

// Configuration
const config = {
  projectName: "Chomicza Nora",
  subtitle: "Projekt Maszynownia",
  description: "HomeLAB self-hostingu wykorzystujący PC do uruchamiania usług: Discord, Minecraft, Teamspeak i więcej!",
  discord: "https://discord.com/invite/ChTAqW8yDv",
  kofi: "https://ko-fi.com/chomiczanora",
  discordWidgetId: "786844869699174401"
};

// Data
const aboutCards = [
  {
    icon: "🖥️",
    title: "HomeLAB Infrastructure",
    description: "Wykorzystujemy PC (Intel i5-11400F, Xeon E5-2690) i Cloud VPS. Łatwa konfiguracja i zdalne zarządzanie."
  },
  {
    icon: "📊",
    title: "Monitoring & Kontrola",
    description: "Monitorowanie zasobów i pełna kontrola. Planowany stack: Grafana, Prometheus."
  },
  {
    icon: "🔓",
    title: "Open-Source First",
    description: "Wszystko na własnych maszynach z open-source. Pełna kontrola nad danymi i bezpieczeństwem."
  }
];

const services = [
  {
    name: "Discord Server",
    description: "Serwer Discord dla społeczności z botami, eventami i aktywnymi kanałami",
    color: "#5865F2",
    link: config.discord,
    linkText: "Dołącz →",
    address: null
  },
  {
    name: "Minecraft Server",
    description: "Dynamiczny self-host paczek modyfikacji. Hosting 24/7 na Primary Node (i5-11400F)",
    color: "#62A87C",
    link: null,
    linkText: null,
    address: "mc.chomiczanora.pl"
  },
  {
    name: "Teamspeak Server",
    description: "Komunikacja głosowa dla społeczności. Self-hosted na infrastrukturze Maszynownia",
    color: "#FF9500",
    link: null,
    linkText: null,
    address: "ts.chomiczanora.pl"
  },
  {
    name: "Wsparcie Ko-fi",
    description: "Wspieraj rozwój projektu i otrzymuj dodatkowe rangi oraz kosmetyki",
    color: "#13C3A4",
    link: config.kofi,
    linkText: "Wesprzyj →",
    address: null
  }
];

const sponsorBenefits = [
  "Rangę Sponsor widoczną w TAB i na czacie serwera",
  "Kolorowe wiadomości na czacie (bez koloru czerwonego)",
  "Dodatki kosmetyczne nie ingerujące w ekonomię",
  "Wpływ na rozwój - głosowanie na nowe funkcje",
  "Ekskluzywne kanały na Discord dla sponsorów"
];

// Component Builders
class ComponentBuilder {
  static createCard(data, isAbout = false) {
    const card = document.createElement('div');
    card.className = 'modern-card';
    
    if (!isAbout && data.color) {
      card.style.borderLeft = `3px solid ${data.color}`;
    }
    
    if (isAbout) {
      card.innerHTML = `
        <div style="font-size: 2.5rem; margin-bottom: 16px;">${data.icon}</div>
        <h3 style="font-size: 1.5rem; margin-bottom: 12px; font-weight: 600;">${data.title}</h3>
        <p style="font-size: 1rem; line-height: 1.6; color: #666;">${data.description}</p>
      `;
    } else {
      const linkHTML = data.link 
        ? `<a href="${data.link}" target="_blank" style="color: ${data.color}; text-decoration: none; font-weight: bold;">${data.linkText}</a>`
        : '';
      const addressHTML = data.address 
        ? `<p style="color: ${data.color}; font-weight: bold; margin: 0;">${data.address}</p>`
        : '';
      
      card.innerHTML = `
        <h3 style="font-size: 1.5rem; margin-bottom: 10px;">${data.name}</h3>
        <p style="font-size: 0.95rem; margin-bottom: 15px; color: #666;">${data.description}</p>
        ${linkHTML}${addressHTML}
      `;
    }
    
    return card;
  }
  
  static createGrid(items, isAbout = false) {
    const grid = document.createElement('div');
    grid.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 25px; max-width: 1200px; margin: 0 auto;';
    
    items.forEach(item => {
      grid.appendChild(this.createCard(item, isAbout));
    });
    
    return grid;
  }
}

// Page Initialization
class App {
  constructor() {
    this.init();
  }
  
  init() {
    this.setupSmoothScroll();
    this.renderAboutSection();
    this.renderServicesSection();
    this.renderSponsorSection();
    this.addAnimations();
  }
  
  setupSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }
  
  renderAboutSection() {
    const container = document.querySelector('#about .grid-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(ComponentBuilder.createGrid(aboutCards, true));
    }
  }
  
  renderServicesSection() {
    const container = document.querySelector('#services .grid-container');
    if (container) {
      container.innerHTML = '';
      container.appendChild(ComponentBuilder.createGrid(services, false));
    }
  }
  
  renderSponsorSection() {
    const list = document.querySelector('#support .benefits-list');
    if (list) {
      list.innerHTML = sponsorBenefits
        .map(benefit => `<li>✅ <strong>${benefit.split(' ')[0]} ${benefit.split(' ')[1]}</strong> ${benefit.split(' ').slice(2).join(' ')}</li>`)
        .join('');
    }
  }
  
  addAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);
    
    document.querySelectorAll('.modern-card').forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = `all 0.5s ease ${index * 0.1}s`;
      observer.observe(card);
    });
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new App());
} else {
  new App();
}

// Copy to clipboard function
window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    alert(`Skopiowano: ${text}`);
  }).catch(err => {
    console.error('Błąd kopiowania:', err);
  });
};
