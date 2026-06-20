const Auth = {
  TOKEN_KEY: 'tsumori_auth_token',
  PRIVACY_VERSION: '2026-06-14',
  mode: 'login',

  token() {
    return localStorage.getItem(this.TOKEN_KEY) || '';
  },

  hasSession() {
    return Boolean(this.token());
  },

  currentUser() {
    return Storage.currentUser();
  },

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body != null) headers['Content-Type'] = 'application/json';
    if (options.auth !== false && this.token()) headers.Authorization = `Bearer ${this.token()}`;
    const response = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body == null ? undefined : JSON.stringify(options.body)
    });
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    if (!response.ok) {
      const error = new Error(data.error || `HTTP_${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  },

  rememberSession(result) {
    localStorage.setItem(this.TOKEN_KEY, result.token);
    Storage.setCurrentAccount(result.user);
    I18n.setLanguage(result.user.uiLanguage || 'zh', false);
  },

  async register(data) {
    const email = String(data.email || '').trim().toLowerCase();
    if (!data.name?.trim() || !email || !data.password || !data.confirmPassword) throw new Error(t('auth.required'));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(t('auth.invalidEmail'));
    if (data.password.length < 8 || !/[A-Za-z]/.test(data.password) || !/\d/.test(data.password)) throw new Error(t('auth.passwordInvalid'));
    if (data.password !== data.confirmPassword) throw new Error(t('auth.passwordMismatch'));
    if (!data.consent) throw new Error(t('auth.consentRequired'));

    try {
      const result = await this.request('/api/auth/register', {
        method: 'POST',
        auth: false,
        body: {
          name: data.name.trim(),
          email,
          password: data.password,
          storageMode: data.storageMode,
          uiLanguage: data.language,
          privacyConsent: true,
          privacyVersion: this.PRIVACY_VERSION
        }
      });
      this.rememberSession(result);
      if (result.user.storageMode === 'cloud') {
        await this.saveCloudData(Storage.getCurrentCollections());
      }
    } catch (error) {
      if (error.message === 'EMAIL_EXISTS') throw new Error(t('auth.emailExists'));
      throw error;
    }
  },

  async login(emailValue, password) {
    try {
      const result = await this.request('/api/auth/login', {
        method: 'POST',
        auth: false,
        body: { email: String(emailValue || '').trim().toLowerCase(), password }
      });
      this.rememberSession(result);
      if (result.user.storageMode === 'cloud') await this.loadCloudData();
    } catch (error) {
      if (error.status === 401 || error.message === 'INVALID_CREDENTIALS') throw new Error(t('auth.loginFailed'));
      throw error;
    }
  },

  async loadCloudData() {
    const result = await this.request('/api/data');
    Storage.hydrateCloud(result.collections || {});
    return result.collections || {};
  },

  async saveCloudData(collections) {
    return this.request('/api/data', { method: 'PUT', body: { collections } });
  },

  async updateAccount(changes) {
    const result = await this.request('/api/account', { method: 'PATCH', body: changes });
    Storage.setCurrentAccount(result.user);
    return result.user;
  },

  async deleteAccount() {
    await this.request('/api/account', { method: 'DELETE' });
    Storage.clearAllLocalData();
    location.hash = '';
    location.reload();
  },

  async changeStorageMode(mode) {
    const nextMode = mode === 'cloud' ? 'cloud' : 'local';
    if (nextMode === 'cloud') await this.saveCloudData(Storage.getCurrentCollections());
    const user = await this.updateAccount({ storageMode: nextMode });
    return user;
  },

  async logout() {
    try {
      if (this.token()) await this.request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Clear the local session even if the server is temporarily unavailable.
    }
    localStorage.removeItem(this.TOKEN_KEY);
    location.hash = '';
    location.reload();
  },

  async start(onAuthenticated) {
    document.getElementById('app').style.display = 'none';
    document.getElementById('public-root').innerHTML = '';
    if (this.token()) {
      try {
        const result = await this.request('/api/auth/me');
        Storage.setCurrentAccount(result.user);
        I18n.setLanguage(result.user.uiLanguage || 'zh', false);
        if (result.user.storageMode === 'cloud') await this.loadCloudData();
        document.getElementById('auth-root').innerHTML = '';
        document.getElementById('public-root').innerHTML = '';
        document.getElementById('app').style.display = '';
        onAuthenticated();
        return;
      } catch {
        localStorage.removeItem(this.TOKEN_KEY);
      }
    }
    if (['auth-login', 'auth-register'].includes(location.hash.replace('#', ''))) {
      this.mode = location.hash.includes('register') ? 'register' : 'login';
      this.render();
      return;
    }
    PublicSite.init();
  },

  render(error = '') {
    const register = this.mode === 'register';
    document.getElementById('public-root').innerHTML = '';
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-root').innerHTML = `
      <main class="auth-page">
        <section class="auth-brand-panel">
          <div class="auth-brand"><span>積</span><strong>Tsumori</strong></div>
          <div>
            <p class="learning-eyebrow">JAPANESE LEARNING</p>
            <h1>${t('auth.welcome')}</h1>
            <p>${t('auth.subtitle')}</p>
            <div class="auth-feature-list">
              <span><i data-lucide="calendar-check"></i>${t('public.featureRecord')}</span>
              <span><i data-lucide="rotate-ccw"></i>${t('public.featureReview')}</span>
              <span><i data-lucide="languages"></i>${t('public.featureLanguages')}</span>
            </div>
          </div>
          <div class="auth-local-note"><i data-lucide="shield-check"></i><div><strong>${t('auth.accountCloudNotice')}</strong><p>${t('auth.accountCloudDetail')}</p></div></div>
        </section>
        <section class="auth-form-panel">
          <button class="auth-back-library" type="button" id="auth-back-library"><i data-lucide="arrow-left"></i>${t('library.backLibrary')}</button>
          <div class="auth-language"><label for="auth-language">${t('auth.language')}</label><select id="auth-language" class="form-input">${I18n.options()}</select></div>
          <form id="auth-form" class="auth-form">
            <h2>${register ? t('auth.register') : t('auth.login')}</h2>
            ${error ? `<p class="auth-error">${this.escapeHtml(error)}</p>` : ''}
            ${register ? `<div class="form-group"><label class="form-label">${t('auth.name')}</label><input id="auth-name" class="form-input" autocomplete="name"></div>` : ''}
            <div class="form-group"><label class="form-label">${t('auth.email')}</label><input id="auth-email" class="form-input" type="email" autocomplete="email"></div>
            <div class="form-group"><label class="form-label">${t('auth.password')}</label><input id="auth-password" class="form-input" type="password" autocomplete="${register ? 'new-password' : 'current-password'}">${register ? `<small class="form-help">${t('auth.passwordHint')}</small>` : ''}</div>
            ${register ? `
              <div class="form-group"><label class="form-label">${t('auth.confirmPassword')}</label><input id="auth-confirm" class="form-input" type="password" autocomplete="new-password"></div>
              <fieldset class="storage-mode-field">
                <legend>${t('storage.choose')}</legend>
                <label class="storage-mode-option">
                  <input type="radio" name="storage-mode" value="local" checked>
                  <span><strong>${t('storage.local')}</strong><small>${t('storage.localDesc')}</small></span>
                </label>
                <label class="storage-mode-option">
                  <input type="radio" name="storage-mode" value="cloud">
                  <span><strong>${t('storage.cloud')}</strong><small>${t('storage.cloudDesc')}</small></span>
                </label>
              </fieldset>
              <label class="auth-consent"><input id="auth-consent" type="checkbox"><span>${t('auth.consent')}</span></label>
              <button class="auth-policy-link" type="button" id="auth-policy">${t('auth.openPolicy')}</button>
            ` : ''}
            <button class="btn btn-primary auth-submit" type="submit">${register ? t('auth.register') : t('auth.login')}</button>
            <p class="auth-switch">${register ? t('auth.hasAccount') : t('auth.noAccount')} <button type="button" id="auth-switch">${register ? t('auth.login') : t('auth.register')}</button></p>
            <p class="auth-security"><i data-lucide="lock-keyhole"></i>${t('auth.security')}</p>
            <nav class="auth-public-links" aria-label="${t('public.information')}">
              <button type="button" data-public-section="about">${t('public.about')}</button>
              <button type="button" data-public-section="privacy">${t('public.privacy')}</button>
              <button type="button" data-public-section="terms">${t('public.terms')}</button>
              <button type="button" data-public-section="data">${t('public.data')}</button>
            </nav>
          </form>
        </section>
      </main>
    `;
    document.getElementById('auth-language').addEventListener('change', event => {
      I18n.setLanguage(event.target.value, false);
      this.render(error);
    });
    document.getElementById('auth-back-library').addEventListener('click', () => {
      document.getElementById('auth-root').innerHTML = '';
      location.hash = 'library';
      PublicSite.route();
    });
    document.getElementById('auth-switch').addEventListener('click', () => {
      this.mode = register ? 'login' : 'register';
      this.render();
    });
    document.getElementById('auth-policy')?.addEventListener('click', () => this.showPolicy());
    document.querySelectorAll('[data-public-section]').forEach(button => {
      button.addEventListener('click', () => this.showPublicInfo(button.dataset.publicSection));
    });
    document.getElementById('auth-form').addEventListener('submit', event => this.handleSubmit(event));
    if (window.lucide) lucide.createIcons();
  },

  async handleSubmit(event) {
    event.preventDefault();
    event.currentTarget.querySelector('[type="submit"]').disabled = true;
    try {
      if (this.mode === 'register') {
        await this.register({
          name: document.getElementById('auth-name').value,
          email: document.getElementById('auth-email').value,
          password: document.getElementById('auth-password').value,
          confirmPassword: document.getElementById('auth-confirm').value,
          storageMode: document.querySelector('input[name="storage-mode"]:checked').value,
          language: document.getElementById('auth-language').value,
          consent: document.getElementById('auth-consent').checked
        });
      } else {
        await this.login(document.getElementById('auth-email').value, document.getElementById('auth-password').value);
      }
      history.replaceState(null, '', `${location.pathname}${location.search}#dashboard`);
      location.reload();
    } catch (error) {
      this.render(error.message);
    }
  },

  showPolicy() {
    const container = document.getElementById('modal-container');
    container.classList.add('policy-modal');
    container.innerHTML = `
      <div class="modal-header">
        <h3>${t('policy.title')}</h3>
        <button class="modal-close" type="button" aria-label="${t('common.close')}" title="${t('common.close')}" id="policy-close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body policy-content">
        <p>${t('policy.summary')}</p>
        ${['data','ai','key','content','rights'].map(section => `<section><h4>${t(`policy.${section}Title`)}</h4><p>${t(`policy.${section}`)}</p></section>`).join('')}
      </div>
      <div class="modal-actions"><button class="btn btn-primary" id="policy-agree">${t('policy.agree')}</button></div>
    `;
    Modal.open();
    document.getElementById('policy-close')?.addEventListener('click', () => Modal.close());
    document.getElementById('policy-agree').addEventListener('click', () => {
      const consent = document.getElementById('auth-consent');
      if (consent) consent.checked = true;
      Modal.close();
    });
    if (window.lucide) lucide.createIcons({ nodes: container.querySelectorAll('[data-lucide]') });
  },

  showPublicInfo(section) {
    if (section === 'privacy' || section === 'terms') {
      this.showPolicy();
      return;
    }
    const isData = section === 'data';
    const container = document.getElementById('modal-container');
    container.classList.add('policy-modal');
    container.innerHTML = `
      <div class="modal-header">
        <h3>${t(isData ? 'public.dataTitle' : 'public.aboutTitle')}</h3>
        <button class="modal-close" type="button" aria-label="${t('common.close')}" title="${t('common.close')}" id="public-info-close"><i data-lucide="x"></i></button>
      </div>
      <div class="modal-body policy-content">
        <p>${t(isData ? 'public.dataCopy' : 'public.aboutCopy')}</p>
        <section>
          <h4>${t(isData ? 'public.localTitle' : 'public.productTitle')}</h4>
          <p>${t(isData ? 'public.localCopy' : 'public.productCopy')}</p>
        </section>
        <section>
          <h4>${t(isData ? 'public.cloudTitle' : 'public.contactTitle')}</h4>
          <p>${t(isData ? 'public.cloudCopy' : 'public.contactCopy')}</p>
        </section>
      </div>
      <div class="modal-actions"><button class="btn btn-primary" id="public-info-done">${t('common.close')}</button></div>
    `;
    Modal.open();
    const close = () => Modal.close();
    document.getElementById('public-info-close')?.addEventListener('click', close);
    document.getElementById('public-info-done')?.addEventListener('click', close);
    if (window.lucide) lucide.createIcons({ nodes: container.querySelectorAll('[data-lucide]') });
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};
window.Auth = Auth;
