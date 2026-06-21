const Analytics = {
  scriptLoaded: false,
  configured: false,
  lastPage: '',

  measurementId() {
    return document.querySelector('meta[name="ga-measurement-id"]')?.content?.trim() || '';
  },

  init() {
    const id = this.measurementId();
    if (!id) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function() {
      window.dataLayer.push(arguments);
    };
    window.gtag('consent', 'default', {
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
      analytics_storage: 'granted'
    });
    window.gtag('set', 'allow_google_signals', false);
    window.gtag('set', 'allow_ad_personalization_signals', false);
    this.loadScript(id);
    window.gtag('js', new Date());
    window.gtag('config', id, { send_page_view: false });
    this.configured = true;
    window.setTimeout(() => this.trackPage(true), 0);
    window.addEventListener('hashchange', () => {
      window.setTimeout(() => this.trackPage(), 0);
    });
  },

  loadScript(id) {
    if (this.scriptLoaded || document.querySelector('script[data-tsumori-ga]')) return;
    const script = document.createElement('script');
    script.async = true;
    script.dataset.tsumoriGa = 'true';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);
    this.scriptLoaded = true;
  },

  route() {
    return location.hash.replace(/^#/, '') || 'welcome';
  },

  trackPage(force = false) {
    if (!this.configured) return;
    const route = this.route();
    const pagePath = `${location.pathname}${location.search}#${route}`;
    if (!force && pagePath === this.lastPage) return;
    this.lastPage = pagePath;
    window.gtag('event', 'page_view', {
      page_title: `Tsumori - ${route}`,
      page_location: `${location.origin}${pagePath}`,
      page_path: pagePath
    });
  },

  event(name, parameters = {}) {
    if (!this.configured) return;
    const safeName = String(name || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 40);
    if (!safeName) return;
    const safeParameters = {};
    Object.entries(parameters).forEach(([key, value]) => {
      if (!/^[a-zA-Z][a-zA-Z0-9_]{0,39}$/.test(key)) return;
      if (typeof value === 'number' || typeof value === 'boolean') safeParameters[key] = value;
      else safeParameters[key] = String(value ?? '').slice(0, 100);
    });
    window.gtag('event', safeName, safeParameters);
  }
};

window.Analytics = Analytics;
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Analytics.init(), { once: true });
} else {
  Analytics.init();
}
