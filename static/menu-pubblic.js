(() => {
  const isAuthenticatedConsumer = () => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    return Boolean(token) && userType === 'consumatore';
  };

  const ensureFontAwesome = () => {
    if (document.querySelector('link[data-public-menu-fa="1"]')) return;
    if (document.querySelector('link[href*="font-awesome"]')) return;
    if (document.querySelector('link[href*="fontawesome"]')) return;

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css';
    link.dataset.publicMenuFa = '1';
    document.head.appendChild(link);
  };

  const buildMenuMarkup = () => `
    <header class="public-fixed-menu" aria-label="Menu pubblico">
      <a href="/index.html" class="public-fixed-menu__brand" aria-label="MuccApp home pubblica">
        <span class="public-fixed-menu__brand-icon" aria-hidden="true"><i class="fa-solid fa-cow public-fixed-menu__brand-cow"></i></span>
        <span class="public-fixed-menu__brand-text">MuccApp</span>
      </a>
      <nav class="public-fixed-menu__nav" aria-label="Navigazione pubblica">
        <a href="/esplora.html" data-menu-link="/esplora.html">Trova gli Allevatori</a>
        <a href="/tracciabilita.html" data-menu-link="/tracciabilita.html">Scansiona i Prodotti</a>
        <a href="/login.html" data-menu-link="/login.html">Login</a>
        <a class="public-fixed-menu__cta" href="/signup.html" data-menu-link="/signup.html">Registrazione</a>
      </nav>
    </header>
  `;

  const setActiveLink = () => {
    const currentPath = window.location.pathname || '';
    document.querySelectorAll('.public-fixed-menu [data-menu-link]').forEach((link) => {
      const target = link.getAttribute('data-menu-link') || '';
      if (target === currentPath) {
        link.classList.add('is-active');
      }
    });
  };

  const mountPublicMenu = async () => {
    if (document.querySelector('.public-fixed-menu')) return;

    if (isAuthenticatedConsumer()) {
      return;
    }

    const body = document.body;
    if (!body) return;

    ensureFontAwesome();

    body.querySelectorAll('[data-global-home-btn]').forEach((el) => el.remove());
    body.insertAdjacentHTML('afterbegin', buildMenuMarkup());
    body.classList.add('public-menu-enabled');
    if (window.location.pathname === '/esplora.html') {
      body.classList.add('public-menu-esplora');
    }

    setActiveLink();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountPublicMenu);
  } else {
    mountPublicMenu();
  }
})();
