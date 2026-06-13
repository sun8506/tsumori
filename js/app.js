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
    if (!this.views[viewName]) {
      console.warn("Unknown view:", viewName);
      viewName = "dashboard";
    }
    this.currentView = viewName;
    if (window.Nav) Nav.highlightCurrentView();
    const view = this.views[viewName];
    if (view && view.init) {
      try {
        await view.init();
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

  if (window.Nav) Nav.init();
  Router.init();

  // Initialize Lucide icons for bottom nav
  if (window.lucide) {
    lucide.createIcons({ nodes: document.querySelectorAll('.bottom-nav-link') });
  }
})();