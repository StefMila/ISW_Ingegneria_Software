(() => {
  const isAuthenticatedConsumer = () => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType');
    return Boolean(token) && userType === 'consumatore';
  };

  const removeConsumerMenu = () => {
    const sidebar = document.getElementById('consumer-sidebar');
    const toggle = document.getElementById('menu-toggle');
    const topActions = document.querySelector('.top-left-actions');
    const overlay = document.querySelector('.sidebar-overlay');

    if (sidebar) sidebar.remove();
    if (toggle) toggle.remove();
    if (topActions) topActions.remove();
    if (overlay) overlay.remove();
  };

  const mountConsumerMenu = async () => {
    if (!isAuthenticatedConsumer()) {
      removeConsumerMenu();
      return;
    }

    const body = document.body;
    if (!body) return;

    const publicMenu = document.querySelector('.public-fixed-menu');
    if (publicMenu) {
      publicMenu.remove();
    }

    if (document.getElementById('consumer-sidebar')) {
      return;
    }

    const menuRoot = document.getElementById('menu-root');
    if (!menuRoot) {
      return;
    }

    try {
      const response = await fetch('/menu-consumatore.html');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      menuRoot.innerHTML = html;
    } catch (error) {
      console.error('Errore caricamento menu consumatore:', error);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountConsumerMenu);
  } else {
    mountConsumerMenu();
  }
})();
