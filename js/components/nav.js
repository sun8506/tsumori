锘?**
 * Navigation Component
 *
 * - 銉兗銉嗐偅銉炽偘銉忋兂銉夈儶銉炽偘
 * - 鐝惧湪銇儞銉ャ兗銈掋儚銈ゃ儵銈ゃ儓
 * - 銉︺兗銈躲兗鍚嶃伄琛ㄧず/鍒囨浛
 */

const Nav = {
  currentView: 'dashboard',

  init() {
    this.bindEvents();
    this.render();
    this.highlightCurrentView();
    // Re-run Lucide icons for bottom nav elements
    if (window.lucide) {
      lucide.createIcons({ nodes: document.querySelectorAll('.bottom-nav-link') });
    }
  },

  bindEvents() {
    // Desktop nav links
    document.querySelectorAll('.desktop-nav .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.dataset.view;
        this.navigate(view);
      });
    });

    // Bottom nav buttons
    document.querySelectorAll('.bottom-nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        this.navigate(view);
      });
    });

    // Browser back/forward
    window.addEventListener('hashchange', () => {
      this.highlightCurrentView();
    });

    // User toggle
    const toggle = document.getElementById('nav-user-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => {
        Settings.showUserSwitcher();
      });
    }
  },

  navigate(view) {
    window.location.hash = view;
    this.highlightCurrentView();
    if (window.Router) {
      window.Router.go(view);
    }
  },

  highlightCurrentView() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.currentView = hash;

    // Highlight desktop nav
    document.querySelectorAll('.desktop-nav .nav-link').forEach(link => {
      const isActive = link.dataset.view === hash;
      link.classList.toggle('active', isActive);
    });

    // Highlight bottom nav
    document.querySelectorAll('.bottom-nav-link').forEach(btn => {
      const isActive = btn.dataset.view === hash;
      btn.classList.toggle('active', isActive);
    });
  },

  render() {
    const config = JSON.parse(Storage.get('_config') || '{}');
    const users = config.users || [];
    const currentId = config.currentUserId;
    const user = users.find(u => u.id === currentId);

    const nameEl = document.getElementById('nav-user-name');
    if (nameEl && user) {
      nameEl.textContent = user.name;
    }
  }
};

window.Nav = Nav;