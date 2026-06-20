/**
 * App - Main Routing and Initialization
 *
 * Hash-based simple router.
 * Each view is expected at window.{ViewName}.
 */

const Router = {
  views: {},
  currentView: "dashboard",

  init() {
    this.bindHash();
    this.go(window.location.hash.replace("#", "") || "dashboard");
  },

  bindHash() {
    window.addEventListener("hashchange", () => {
      const view = window.location.hash.replace("#", "") || "dashboard";
      this.go(view);
    });
  },

  async go(viewName) {
    if (!window.Auth?.currentUser()) return;
    if (viewName === 'welcome' || viewName === 'library' || viewName.startsWith('learn/')) {
      document.getElementById('app').style.display = 'none';
      document.getElementById('auth-root').innerHTML = '';
      if (viewName.startsWith('learn/')) PublicSite.renderDetail(viewName.slice(6));
      else if (viewName === 'library') PublicSite.renderLibrary();
      else PublicSite.renderHome();
      return;
    }
    if (!this.views[viewName]) {
      console.warn("Unknown view:", viewName);
      viewName = "dashboard";
    }
    document.getElementById('public-root').innerHTML = '';
    document.getElementById('app').style.display = '';
    this.currentView = viewName;
    if (window.Nav) Nav.highlightCurrentView();
    const view = this.views[viewName];
    if (view && view.init) {
      try {
        await view.init();
        I18n.apply(document.getElementById('main-content'));
      } catch (e) {
        console.error("View " + viewName + " init error:", e);
        this.showError(viewName, e.message);
      }
    }
  },

  register(name, view) {
    this.views[name] = view;
  },

  showError(viewName, message) {
    const main = document.getElementById("main-content");
    main.innerHTML =
      "<header class=\"view-header\"><h1>Error</h1></header>" +
      "<div class=\"card\">" +
      "<p>Failed to load view: " + this.escapeHtml(viewName) + "</p>" +
      "<p style=\"color:var(--text-light);font-size:0.85rem;margin-top:8px\">" + this.escapeHtml(message) + "</p>" +
      "<button class=\"btn btn-primary\" onclick=\"window.location.hash='dashboard'\" style=\"margin-top:12px\">Back to dashboard</button>" +
      "</div>";
  },

  escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Router = Router;

// —— Startup ——
(function() {
  const viewMap = {
    dashboard: window.Dashboard,
    vocabulary: window.Vocabulary,
    phrases: window.Phrases,
    article: window.Article,
    speaking: window.Speaking,
    settings: window.Settings,
    expert: window.Expert,
  };
  for (const [name, view] of Object.entries(viewMap)) {
    if (view) Router.register(name, view);
  }

  Auth.start(() => {
    I18n.observe();
    const pendingTarget = window.PublicSite?.consumePendingAction?.();
    if (pendingTarget) {
      history.replaceState(null, '', `${location.pathname}${location.search}#${pendingTarget}`);
    }
    if (window.Nav) Nav.init();
    Router.init();
    I18n.apply(document);
    if (window.lucide) lucide.createIcons();
  });
})();
