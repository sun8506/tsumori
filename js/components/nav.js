/**
 * Navigation component.
 */

const Nav = {
  init() {
    this.bindEvents();
    this.render();
    this.highlightCurrentView();
  },

  bindEvents() {
    document.querySelectorAll('[data-view]').forEach(item => {
      item.addEventListener('click', event => {
        event.preventDefault();
        this.navigate(item.dataset.view);
      });
    });

    const toggle = document.getElementById('nav-user-toggle');
    if (toggle) {
      toggle.addEventListener('click', () => Auth.logout());
    }
    const mobileLogout = document.getElementById('bottom-nav-logout');
    if (mobileLogout) {
      mobileLogout.addEventListener('click', () => Auth.logout());
    }
  },

  navigate(view) {
    if (!view) return;
    if (window.location.hash.replace('#', '') !== view) {
      window.location.hash = view;
    } else if (window.Router) {
      Router.go(view);
    }
    this.highlightCurrentView();
  },

  highlightCurrentView() {
    const current = window.location.hash.replace('#', '') || 'dashboard';
    document.querySelectorAll('[data-view]').forEach(item => {
      item.classList.toggle('active', item.dataset.view === current);
    });
  },

  render() {
    const config = Storage.getConfig();
    const user = config.users.find(item => item.id === config.currentUserId);
    const name = document.getElementById('nav-user-name');
    if (name) name.textContent = user?.name || '';
    I18n.apply(document);
  }
};

window.Nav = Nav;
