const PublicSite = {
  STATS_KEY: 'tsumori_public_stats',
  PENDING_KEY: 'tsumori_public_pending_action',
  currentLevel: 'all',
  currentIndustry: 'all',

  init() {
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-root').innerHTML = '';
    this.bindHash();
    this.route();
  },

  bindHash() {
    if (this.bound) return;
    window.addEventListener('hashchange', () => {
      if (!Auth.hasSession() && !['auth-login', 'auth-register'].includes(this.hash())) this.route();
    });
    this.bound = true;
  },

  hash() {
    return location.hash.replace(/^#/, '');
  },

  route() {
    const hash = this.hash();
    if (hash.startsWith('learn/')) {
      this.renderDetail(hash.slice(6));
      return;
    }
    if (hash === 'library') {
      this.renderLibrary();
      return;
    }
    if (hash === 'auth-login') {
      this.openAuth('login');
      return;
    }
    if (hash === 'auth-register') {
      this.openAuth('register');
      return;
    }
    this.renderHome();
  },

  renderShell(content, active = '') {
    const root = document.getElementById('public-root');
    const signedIn = Auth.hasSession();
    root.innerHTML = `
      <div class="public-site">
        <header class="public-nav">
          <a class="public-brand" href="#welcome"><span>積</span><strong>Tsumori</strong></a>
          <nav>
            <a href="#welcome" class="${active === 'home' ? 'active' : ''}">${t('library.home')}</a>
            <a href="#library" class="${active === 'library' ? 'active' : ''}">${t('library.title')}</a>
          </nav>
          <div class="public-nav-actions">
            <select id="public-language" aria-label="${t('auth.language')}">${I18n.options()}</select>
            ${signedIn
              ? `<button class="btn btn-primary" data-app="dashboard">${t('library.app')}</button>`
              : `<button class="public-login" data-auth="login">${t('auth.login')}</button>
                 <button class="btn btn-primary" data-auth="register">${t('library.register')}</button>`}
          </div>
        </header>
        ${this.statsBar()}
        ${content}
        <footer class="public-footer">
          <div><strong>Tsumori</strong><span>${t('library.footer')}</span></div>
          <nav>
            <button data-info="about">${t('public.about')}</button>
            <button data-info="privacy">${t('public.privacy')}</button>
            <button data-info="data">${t('public.data')}</button>
          </nav>
        </footer>
      </div>
    `;
    root.querySelectorAll('[data-auth]').forEach(button => {
      button.addEventListener('click', () => signedIn ? this.openApp('dashboard') : this.openAuth(button.dataset.auth));
    });
    root.querySelectorAll('[data-app]').forEach(button => {
      button.addEventListener('click', () => this.openApp(button.dataset.app));
    });
    root.querySelectorAll('[data-save-session]').forEach(button => {
      button.addEventListener('click', () => this.requestSessionAccount());
    });
    root.querySelectorAll('[data-info]').forEach(button => {
      button.addEventListener('click', () => Auth.showPublicInfo(button.dataset.info));
    });
    document.getElementById('public-language')?.addEventListener('change', event => {
      I18n.setLanguage(event.target.value, false);
      this.route();
    });
    if (window.lucide) lucide.createIcons();
  },

  renderHome() {
    const featured = PublicContent.items.slice(0, 3);
    this.renderShell(`
      <main class="public-main">
        <section class="public-hero">
          <div class="public-hero-copy">
            <span class="public-eyebrow">${t('library.eyebrow')}</span>
            <h1>${t('library.hero')}</h1>
            <p>${t('library.heroCopy')}</p>
            <div class="public-hero-actions">
              <a class="btn btn-primary" href="#library">${t('library.start')}</a>
              <button class="btn btn-secondary" data-auth="register">${t('library.saveJourney')}</button>
            </div>
            <div class="public-proof">
              <span><strong>${PublicContent.items.length}</strong>${t('library.freeLessons')}</span>
              <span><strong>6</strong>${t('library.languages')}</span>
              <span><strong>0</strong>${t('library.cost')}</span>
            </div>
          </div>
          <div class="public-hero-report">
            <span>${t('library.preview')}</span>
            <h2>${t('library.todayPreview')}</h2>
            <div class="preview-metric"><i data-lucide="newspaper"></i><span><strong>1</strong>${t('library.articles')}</span></div>
            <div class="preview-metric"><i data-lucide="book-open"></i><span><strong>8</strong>${t('library.words')}</span></div>
            <div class="preview-metric"><i data-lucide="quote"></i><span><strong>3</strong>${t('library.phrases')}</span></div>
            <p>${t('library.previewHint')}</p>
          </div>
        </section>

        <section class="public-section">
          <div class="public-section-heading">
            <div><span>${t('library.today')}</span><h2>${t('library.recommended')}</h2></div>
            <a href="#library">${t('library.viewAll')} <i data-lucide="arrow-right"></i></a>
          </div>
          <div class="public-card-grid">${featured.map(item => this.contentCard(item)).join('')}</div>
        </section>

        <section class="public-categories">
          ${this.categoryCard('reading', 'newspaper')}
          ${this.categoryCard('industry', 'briefcase-business')}
          ${this.categoryCard('phrase', 'messages-square')}
          ${this.categoryCard('word', 'book-open')}
        </section>

        <section class="public-wide-cta">
          <div><span>${t('library.keepLearning')}</span><h2>${t('library.ctaTitle')}</h2><p>${t('library.ctaCopy')}</p></div>
          <button class="btn btn-primary" data-auth="register">${t('library.registerFree')}</button>
        </section>
      </main>
    `, 'home');
  },

  renderLibrary() {
    const levels = ['all', 'BEGINNER', 'N5', 'N4', 'N3', 'N2', 'N1'];
    const industries = ['all', 'general', 'it', 'sales', 'realestate', 'hospitality', 'food', 'service', 'education', 'manufacturing'];
    const visible = PublicContent.items.filter(item =>
      (this.currentLevel === 'all' || item.level === this.currentLevel) &&
      (this.currentIndustry === 'all' || item.industry === this.currentIndustry)
    );
    this.renderShell(`
      <main class="public-main">
        <header class="library-header">
          <span class="public-eyebrow">${t('library.eyebrow')}</span>
          <h1>${t('library.title')}</h1>
          <p>${t('library.subtitle')}</p>
        </header>
        <section class="library-filter-panel">
          <div class="library-filter-row">
            <strong>${t('library.levelFilter')}</strong>
            <div class="library-filters">
              ${levels.map(level => `<button class="${level === this.currentLevel ? 'active' : ''}" data-level="${level}">${this.levelLabel(level)}</button>`).join('')}
            </div>
          </div>
          <div class="library-filter-row">
            <strong>${t('library.industryFilter')}</strong>
            <div class="library-filters">
              ${industries.map(industry => `<button class="${industry === this.currentIndustry ? 'active' : ''}" data-industry="${industry}">${this.industryLabel(industry)}</button>`).join('')}
            </div>
          </div>
        </section>
        <div class="library-result-heading">
          <span>${t('library.results', { count: visible.length })}</span>
          ${(this.currentLevel !== 'all' || this.currentIndustry !== 'all') ? `<button id="library-clear-filters">${t('library.clearFilters')}</button>` : ''}
        </div>
        ${visible.length
          ? `<div class="public-card-grid library-grid">${visible.map(item => this.contentCard(item)).join('')}</div>`
          : `<div class="library-empty"><i data-lucide="search-x"></i><h2>${t('library.noResults')}</h2><p>${t('library.noResultsHelp')}</p><button class="btn btn-secondary" id="library-empty-clear">${t('library.clearFilters')}</button></div>`}
        <section class="public-inline-cta">
          <i data-lucide="calendar-check"></i>
          <div><strong>${t('library.inlineTitle')}</strong><p>${t('library.inlineCopy')}</p></div>
          <button class="btn btn-primary" data-auth="register">${t('library.register')}</button>
        </section>
      </main>
    `, 'library');
    document.querySelectorAll('[data-level]').forEach(button => {
      button.addEventListener('click', () => {
        this.currentLevel = button.dataset.level;
        this.renderLibrary();
      });
    });
    document.querySelectorAll('[data-industry]').forEach(button => {
      button.addEventListener('click', () => {
        this.currentIndustry = button.dataset.industry;
        this.renderLibrary();
      });
    });
    const clear = () => {
      this.currentLevel = 'all';
      this.currentIndustry = 'all';
      this.renderLibrary();
    };
    document.getElementById('library-clear-filters')?.addEventListener('click', clear);
    document.getElementById('library-empty-clear')?.addEventListener('click', clear);
  },

  renderDetail(id) {
    const item = PublicContent.get(id);
    if (!item) {
      location.hash = 'library';
      return;
    }
    this.recordView(item);
    this.renderShell(`
      <main class="public-main public-reader">
        <a class="public-back" href="#library"><i data-lucide="arrow-left"></i>${t('library.back')}</a>
        <article class="public-article">
          <header>
            <div class="public-card-meta">
              <span>${this.levelLabel(item.level)}</span>
              <span>${this.industryLabel(item.industry)}</span>
              <span>${t(`library.type.${item.type}`)}</span>
              ${(item.tags || []).map(tag => `<span class="is-skill">${t(`library.tag.${tag}`)}</span>`).join('')}
              <span>${item.minutes} ${t('library.minutes')}</span>
            </div>
            <h1>${this.escapeHtml(item.title)}</h1>
            <p>${this.escapeHtml(item.summary)}</p>
            ${item.scene ? `<div class="public-scene"><i data-lucide="map-pin"></i><strong>${t('library.scene')}</strong><span>${this.escapeHtml(item.scene)}</span></div>` : ''}
          </header>
          <div class="public-reading-body">
            ${item.paragraphs.map(paragraph => `<p>${this.renderFurigana(paragraph)}</p>`).join('')}
          </div>
          <section class="public-translation"><h2>${t('library.translation')}</h2><p>${this.escapeHtml(item.translation)}</p></section>
          <section class="public-vocab-section">
            <div class="public-section-heading"><div><span>${t('library.thisLesson')}</span><h2>${t('library.keyWords')}</h2></div></div>
            <div class="public-vocab-grid">
              ${item.vocab.map(word => `
                <div class="public-vocab-card">
                  <div><strong>${this.escapeHtml(word.word)}</strong><span>${this.escapeHtml(word.reading)}</span></div>
                  <p>${this.escapeHtml(word.meaning)}</p>
                  <button data-save-word="${this.escapeAttr(word.word)}" data-item-id="${item.id}"><i data-lucide="bookmark-plus"></i>${t('library.save')}</button>
                </div>
              `).join('')}
            </div>
          </section>
          <section class="public-phrase-section">
            <h2>${t('library.usefulPhrases')}</h2>
            ${item.phrases.map(phrase => `<div><i data-lucide="quote"></i><span>${this.escapeHtml(phrase)}</span><button data-practice="${this.escapeAttr(phrase)}" data-item-id="${item.id}">${t('library.practice')}</button></div>`).join('')}
          </section>
        </article>
        ${this.completionCard(item)}
      </main>
    `, 'library');
    document.querySelectorAll('[data-save-word]').forEach(button => {
      button.addEventListener('click', () => this.requestAccount('word', item, button.dataset.saveWord));
    });
    document.querySelectorAll('[data-practice]').forEach(button => {
      button.addEventListener('click', () => this.requestAccount('phrase', item, button.dataset.practice));
    });
    document.getElementById('public-complete-register')?.addEventListener('click', () => this.requestAccount('article', item));
  },

  contentCard(item) {
    return `
      <a class="public-content-card" href="#learn/${item.id}">
        <span class="public-card-icon"><i data-lucide="${item.icon}"></i></span>
        <div class="public-card-meta">
          <span>${this.levelLabel(item.level)}</span>
          <span>${this.industryLabel(item.industry)}</span>
          <span>${t(`library.type.${item.type}`)}</span>
          ${(item.tags || []).map(tag => `<span class="is-skill">${t(`library.tag.${tag}`)}</span>`).join('')}
        </div>
        <h3>${this.escapeHtml(item.title)}</h3>
        <p>${this.escapeHtml(item.summary)}</p>
        ${item.scene ? `<p class="public-card-scene"><i data-lucide="map-pin"></i>${this.escapeHtml(item.scene)}</p>` : ''}
        <footer><span><i data-lucide="clock-3"></i>${item.minutes} ${t('library.minutes')}</span><strong>${t('library.read')} <i data-lucide="arrow-right"></i></strong></footer>
      </a>
    `;
  },

  categoryCard(type, icon) {
    return `
      <button data-category="${type}">
        <i data-lucide="${icon}"></i>
        <strong>${t(`library.filter.${type}`)}</strong>
        <span>${t(`library.category.${type}`)}</span>
      </button>
    `;
  },

  levelLabel(level) {
    if (level === 'all') return t('library.level.all');
    if (level === 'BEGINNER') return t('library.level.beginner');
    return level;
  },

  industryLabel(industry) {
    if (industry === 'all') return t('library.industry.all');
    if (industry === 'general') return t('industry.none');
    return t(`industry.${industry}`);
  },

  completionCard(item) {
    return `
      <section class="public-completion">
        <span>${t('library.completed')}</span>
        <h2>${t('library.completionTitle')}</h2>
        <div>
          <p><strong>1</strong>${t('library.articles')}</p>
          <p><strong>${item.vocab.length}</strong>${t('library.words')}</p>
          <p><strong>${item.phrases.length}</strong>${t('library.phrases')}</p>
        </div>
        <p>${t('library.completionCopy')}</p>
        <button class="btn btn-primary" id="public-complete-register">${t('library.registerAndSave')}</button>
      </section>
    `;
  },

  statsBar() {
    const stats = this.getStats();
    if (!stats.views) return '';
    return `<div class="public-stats"><i data-lucide="footprints"></i><span>${t('library.session')}: <strong>${stats.views}</strong> ${t('library.lessons')} · <strong>${stats.words}</strong> ${t('library.words')}</span><button data-save-session>${t('library.saveProgress')}</button></div>`;
  },

  recordView(item) {
    const stats = this.getStats();
    if (!stats.ids.includes(item.id)) {
      stats.ids.push(item.id);
      stats.views += 1;
      stats.words += item.vocab.length;
      stats.phrases += item.phrases.length;
      localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
    }
  },

  getStats() {
    try {
      return { views: 0, words: 0, phrases: 0, ids: [], ...JSON.parse(localStorage.getItem(this.STATS_KEY) || '{}') };
    } catch {
      return { views: 0, words: 0, phrases: 0, ids: [] };
    }
  },

  requestAccount(kind, item, value = '') {
    localStorage.setItem(this.PENDING_KEY, JSON.stringify({
      kind,
      itemId: item.id,
      value,
      createdAt: new Date().toISOString()
    }));
    if (Auth.hasSession()) {
      const target = this.consumePendingAction() || 'dashboard';
      this.openApp(target);
      return;
    }
    this.openAuth('register');
  },

  requestSessionAccount() {
    const stats = this.getStats();
    localStorage.setItem(this.PENDING_KEY, JSON.stringify({
      kind: 'session',
      itemIds: stats.ids,
      createdAt: new Date().toISOString()
    }));
    if (Auth.hasSession()) {
      const target = this.consumePendingAction() || 'dashboard';
      this.openApp(target);
      return;
    }
    this.openAuth('register');
  },

  consumePendingAction() {
    let action = null;
    try {
      action = JSON.parse(localStorage.getItem(this.PENDING_KEY) || 'null');
    } catch {
      action = null;
    }
    if (!action) return '';
    if (action.kind === 'session') {
      const existing = new Set(Storage.getAll('articles').map(article => article.publicContentId).filter(Boolean));
      (action.itemIds || []).forEach(itemId => {
        const viewed = PublicContent.get(itemId);
        if (!viewed || existing.has(viewed.id)) return;
        Storage.add('articles', {
          kind: 'public-library',
          title: viewed.title,
          summary: viewed.summary,
          publicContentId: viewed.id,
          source: 'public-library',
          created: new Date().toISOString()
        });
      });
      localStorage.removeItem(this.PENDING_KEY);
      return 'dashboard';
    }
    const item = PublicContent.get(action.itemId);
    if (!item) {
      localStorage.removeItem(this.PENDING_KEY);
      return '';
    }
    if (action.kind === 'word') {
      const word = item.vocab.find(entry => entry.word === action.value);
      if (word) {
        Storage.add('vocabulary', {
          word: word.word,
          reading: word.reading,
          meaningZh: word.meaning,
          meaningJp: '',
          source: 'public-library',
          publicContentId: item.id,
          ...SM2.initItem(),
          created: new Date().toISOString()
        });
      }
      localStorage.removeItem(this.PENDING_KEY);
      return 'vocabulary';
    }
    if (action.kind === 'phrase') {
      const exists = Storage.getAll('phrases').some(phrase => String(phrase.japanese || '').trim() === String(action.value || '').trim());
      if (!exists) {
        Storage.add('phrases', {
          japanese: action.value,
          reading: '',
          chinese: item.translation,
          category: 'other',
          source: 'public-library',
          publicContentId: item.id,
          ...SM2.initItem(),
          created: new Date().toISOString()
        });
      }
      localStorage.removeItem(this.PENDING_KEY);
      return 'phrases';
    }
    const exists = Storage.getAll('articles').some(article => article.publicContentId === item.id);
    if (!exists) {
      Storage.add('articles', {
        kind: 'public-library',
        title: item.title,
        summary: item.summary,
        publicContentId: item.id,
        source: 'public-library',
        created: new Date().toISOString()
      });
    }
    localStorage.removeItem(this.PENDING_KEY);
    return 'dashboard';
  },

  openAuth(mode) {
    if (Auth.hasSession()) {
      this.openApp('dashboard');
      return;
    }
    document.getElementById('public-root').innerHTML = '';
    Auth.mode = mode;
    history.replaceState(null, '', `${location.pathname}${location.search}#auth-${mode}`);
    Auth.render();
  },

  openApp(view = 'dashboard') {
    document.getElementById('public-root').innerHTML = '';
    document.getElementById('app').style.display = '';
    if (location.hash.replace('#', '') !== view) {
      location.hash = view;
    } else {
      Router.go(view);
    }
  },

  renderFurigana(text) {
    return this.escapeHtml(text).replace(/([\u3400-\u9fff々]+)\(([^)]+)\)/g, '<ruby>$1<rt>$2</rt></ruby>');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  },

  escapeAttr(text) {
    return this.escapeHtml(text).replace(/"/g, '&quot;');
  }
};

document.addEventListener('click', event => {
  const category = event.target.closest('[data-category]');
  if (!category) return;
  PublicSite.currentLevel = 'all';
  PublicSite.currentIndustry = 'all';
  location.hash = 'library';
});

window.PublicSite = PublicSite;
