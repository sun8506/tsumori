const Settings = {
  currentTab: 'account',

  async init() {
    this.render();
  },

  render() {
    document.getElementById('main-content').innerHTML = `
      <header class="view-header">
        <h1>${t('settings.title')}</h1>
        <p class="view-subtitle">${t('settings.subtitle')}</p>
      </header>
      <div class="settings-tabs">
        <button class="settings-tab" data-tab="account">${t('settings.account')}</button>
        <button class="settings-tab" data-tab="profile">${t('settings.profile')}</button>
        <button class="settings-tab" data-tab="api">${t('settings.api')}</button>
        <button class="settings-tab" data-tab="data">${t('settings.data')}</button>
        <button class="settings-tab" data-tab="guide">${t('settings.guide')}</button>
        <button class="settings-tab" data-tab="about">${t('settings.about')}</button>
      </div>
      <div id="settings-body"></div>
    `;
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        this.showTab(tab.dataset.tab);
      });
    });
    document.querySelector(`[data-tab="${this.currentTab}"]`)?.classList.add('active');
    this.showTab(this.currentTab);
  },

  showTab(tab) {
    this.currentTab = tab;
    if (tab === 'account') this.renderAccount();
    if (tab === 'profile') this.renderProfile();
    if (tab === 'api') this.renderApi();
    if (tab === 'data') this.renderData();
    if (tab === 'guide') this.renderGuide();
    if (tab === 'about') this.renderAbout();
  },

  renderAccount() {
    const config = Storage.getConfig();
    const user = config.users.find(item => item.id === config.currentUserId);
    const storageMode = user?.storageMode === 'cloud' ? 'cloud' : 'local';
    document.getElementById('settings-body').innerHTML = `
      <div class="card account-card">
        <div class="card-header">
          <div>
            <h3>${this.escapeHtml(user?.name || '')}</h3>
            <p class="card-subtitle">${this.escapeHtml(user?.email || '')}</p>
          </div>
          <span class="badge badge-primary">${t(`storage.${storageMode}`)}</span>
        </div>
        <p class="settings-guide-copy">${t(`storage.${storageMode}Settings`)}</p>
      </div>
      <div class="card">
        <h3>${t('storage.current')}</h3>
        <div class="storage-mode-settings">
          <label class="storage-mode-option">
            <input type="radio" name="settings-storage-mode" value="local" ${storageMode === 'local' ? 'checked' : ''}>
            <span><strong>${t('storage.local')}</strong><small>${t('storage.localDesc')}</small></span>
          </label>
          <label class="storage-mode-option">
            <input type="radio" name="settings-storage-mode" value="cloud" ${storageMode === 'cloud' ? 'checked' : ''}>
            <span><strong>${t('storage.cloud')}</strong><small>${t('storage.cloudDesc')}</small></span>
          </label>
        </div>
        <button class="btn btn-primary" id="btn-change-storage">${t('storage.change')}</button>
      </div>
      <div class="card">
        <h3>${t('settings.language')}</h3>
        <p class="card-subtitle">${t('settings.languageHelp')}</p>
        <div class="form-group settings-language-field">
          <select class="form-input" id="settings-ui-language">${I18n.options(user?.uiLanguage || I18n.getLanguage())}</select>
        </div>
      </div>
      <div class="card">
        <h3>${t('settings.privacy')}</h3>
        <p class="settings-guide-copy">${t('settings.consentAt')}: ${user?.privacyConsentAt ? I18n.date(user.privacyConsentAt, { year: 'numeric', month: 'long', day: 'numeric' }) : '-'}</p>
        <button class="btn btn-secondary" id="btn-view-policy">${t('auth.openPolicy')}</button>
      </div>
      <button class="btn btn-danger" id="btn-logout">${t('settings.logout')}</button>
    `;
    document.getElementById('settings-ui-language').addEventListener('change', event => {
      I18n.setLanguage(event.target.value);
      Nav.render();
      this.render();
    });
    document.getElementById('btn-change-storage').addEventListener('click', async event => {
      const button = event.currentTarget;
      const mode = document.querySelector('input[name="settings-storage-mode"]:checked').value;
      button.disabled = true;
      try {
        await Auth.changeStorageMode(mode);
        alert(t('storage.saved'));
        this.renderAccount();
      } catch (error) {
        alert(error.message);
        button.disabled = false;
      }
    });
    document.getElementById('btn-view-policy').addEventListener('click', () => Auth.showPolicy());
    document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
  },

  renderUsers() {
    const config = Storage.getConfig();
    const body = document.getElementById('settings-body');
    body.innerHTML = `
      <div id="user-list">
        ${config.users.map(user => `
          <div class="card ${user.id === config.currentUserId ? 'user-card-current' : ''}">
            <div class="card-header">
              <strong>${this.escapeHtml(user.name)}</strong>
              ${user.id === config.currentUserId ? '<span class="badge badge-primary">Active</span>' : `<button class="btn btn-secondary btn-sm" data-switch="${user.id}">Switch</button>`}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-add-user">Add user</button>
      </div>
    `;
    body.querySelectorAll('[data-switch]').forEach(button => {
      button.addEventListener('click', () => {
        Storage.switchUser(button.dataset.switch);
        Nav.render();
        this.renderUsers();
      });
    });
    document.getElementById('btn-add-user').addEventListener('click', () => this.addUser());
  },

  renderProfile() {
    const userId = Storage._getCurrentUserId();
    const userData = Storage.getUserProfile(userId);
    const profile = userData.profile;
    const settings = userData.settings;
    document.getElementById('settings-body').innerHTML = `
      <div class="card">
        <h3>${t('profile.title')}</h3>
        <div class="form-group">
          <label class="form-label">Explanation language</label>
          <select class="form-input" id="input-language">
            ${this.option('zh', 'Chinese', profile.language)}
            ${this.option('en', 'English', profile.language)}
            ${this.option('zh-en', t('profile.zhEn'), profile.language)}
            ${this.option('ja-zh', t('profile.jaZh'), profile.language)}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Industry</label>
          <select class="form-input" id="input-industry">
            ${['none', 'it', 'sales', 'realestate', 'hospitality', 'food', 'service', 'education', 'manufacturing'].map(value => this.option(value, t(`industry.${value}`), profile.industry)).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Japanese level</label>
          <select class="form-input" id="input-level">
            ${['n5', 'n4', 'n3', 'n2', 'n1', 'free'].map(value => this.option(value, value.toUpperCase(), profile.level || 'n3')).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label"><input type="checkbox" id="chk-auto-vocab" ${settings.autoAddToVocab ? 'checked' : ''}> ${t('profile.autoVocab')}</label>
        </div>
        <div class="form-group">
          <label class="form-label">Max examples</label>
          <input class="form-input" id="input-max-examples" type="number" min="1" max="5" value="${settings.maxExamples || 3}">
        </div>
        <button class="btn btn-primary" id="btn-save-profile">${t('common.save')}</button>
      </div>
    `;
    document.getElementById('btn-save-profile').addEventListener('click', () => {
      Storage.updateUserProfile(userId, {
        profile: {
          language: document.getElementById('input-language').value,
          industry: document.getElementById('input-industry').value,
          level: document.getElementById('input-level').value
        },
        settings: {
          autoAddToVocab: document.getElementById('chk-auto-vocab').checked,
          maxExamples: Number(document.getElementById('input-max-examples').value || 3)
        }
      });
      alert(t('profile.saved'));
    });
  },

  renderApi() {
    const config = Storage.getConfig();
    const ai = config.ai;
    const providerIds = ['gemini', 'openai', 'deepseek'];
    document.getElementById('settings-body').innerHTML = `
      <div class="card">
        <div class="card-header">
          <div>
            <h3>${t('api.title')}</h3>
            <p class="card-subtitle">${t('api.help')}</p>
          </div>
        </div>
        <div class="ai-provider-switch" role="radiogroup" aria-label="AI provider">
          ${providerIds.map(providerId => `
            <label class="ai-provider-option ${ai.activeProvider === providerId ? 'active' : ''}">
              <input type="radio" name="ai-provider" value="${providerId}" ${ai.activeProvider === providerId ? 'checked' : ''}>
              <span>${AIProvider.PROVIDERS[providerId].label}</span>
              <small>${ai.activeProvider === providerId ? t('api.enabled') : t('api.disabled')}</small>
            </label>
          `).join('')}
        </div>
        <div class="ai-provider-configs">
          ${providerIds.map(providerId => this.providerConfigForm(providerId, ai)).join('')}
        </div>
        <div class="view-actions">
          <button class="btn btn-primary" id="btn-save-api">${t('api.save')}</button>
        </div>
      </div>
    `;

    document.querySelectorAll('input[name="ai-provider"]').forEach(input => {
      input.addEventListener('change', () => this.updateProviderState(input.value));
    });
    this.updateProviderState(ai.activeProvider);

    document.getElementById('btn-save-api').addEventListener('click', () => {
      const next = Storage.getConfig();
      const activeProvider = document.querySelector('input[name="ai-provider"]:checked').value;
      next.ai.activeProvider = activeProvider;
      providerIds.forEach(providerId => {
        next.ai.providers[providerId] = {
          apiKey: document.getElementById(`input-api-key-${providerId}`).value.trim(),
          model: document.getElementById(`input-model-${providerId}`).value
        };
      });
      Storage.saveConfig(next);
      alert(`${AIProvider.PROVIDERS[activeProvider].label} is now the active AI provider.`);
    });
  },

  providerConfigForm(providerId, ai) {
    const definition = AIProvider.PROVIDERS[providerId];
    const provider = ai.providers[providerId];
    const placeholder = {
      gemini: 'AIza...',
      openai: 'sk-...',
      deepseek: 'sk-...'
    }[providerId];
    return `
      <section class="ai-provider-config" data-provider-config="${providerId}">
        <div class="form-group">
          <label class="form-label" for="input-api-key-${providerId}">${definition.label} API Key</label>
          <input class="form-input" id="input-api-key-${providerId}" type="password" value="${this.escapeAttr(provider.apiKey || '')}" placeholder="${placeholder}" autocomplete="off">
        </div>
        <div class="form-group">
          <label class="form-label" for="input-model-${providerId}">${t('api.model')}</label>
          <select class="form-input" id="input-model-${providerId}">
            ${definition.models.map(model => this.option(model.value, model.label, provider.model)).join('')}
          </select>
        </div>
      </section>
    `;
  },

  updateProviderState(activeProvider) {
    document.querySelectorAll('.ai-provider-option').forEach(option => {
      const input = option.querySelector('input');
      const active = input.value === activeProvider;
      option.classList.toggle('active', active);
      option.querySelector('small').textContent = active ? t('api.enabled') : t('api.disabled');
    });
    document.querySelectorAll('[data-provider-config]').forEach(section => {
      const active = section.dataset.providerConfig === activeProvider;
      section.classList.toggle('active', active);
      section.querySelectorAll('input, select').forEach(control => {
        control.disabled = !active;
      });
    });
  },

  renderData() {
    document.getElementById('settings-body').innerHTML = `
      <div class="card">
        <h3>${t('data.exportTitle')}</h3>
        <p class="card-subtitle">${t('data.exportHelp')}</p>
        <button class="btn btn-primary" id="btn-export">${t('data.export')}</button>
      </div>
      <div class="card">
        <h3>${t('data.importTitle')}</h3>
        <input class="form-input" type="file" id="file-import" accept=".json">
        <button class="btn btn-secondary" id="btn-import">${t('data.import')}</button>
      </div>
      <div class="card">
        <h3>${t('data.danger')}</h3>
        <button class="btn btn-danger" id="btn-clear">${t('data.clear')}</button>
      </div>
    `;
    document.getElementById('btn-export').addEventListener('click', () => this.exportData());
    document.getElementById('btn-import').addEventListener('click', () => this.importData());
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('Delete all local Tsumori data?')) {
        Object.keys(localStorage).filter(key => key.startsWith(Storage.PREFIX)).forEach(key => localStorage.removeItem(key));
        Storage.init();
        location.reload();
      }
    });
  },

  renderGuide() {
    document.getElementById('settings-body').innerHTML = `
      <div class="card">
        <h3>${t('guide.startTitle')}</h3>
        <p class="settings-guide-copy">${t('guide.start')}</p>
      </div>
      <div class="card">
        <h3>${t('guide.dailyTitle')}</h3>
        <p class="settings-guide-copy">${t('guide.daily')}</p>
      </div>
      <div class="card">
        <h3>${t('guide.backupTitle')}</h3>
        <p class="settings-guide-copy">${t('guide.backup')}</p>
      </div>
      <div class="card settings-guide-warning">
        <h3>${t('guide.noticeTitle')}</h3>
        <p class="settings-guide-copy">${t('guide.notice')}</p>
      </div>
    `;
  },

  renderAbout() {
    document.getElementById('settings-body').innerHTML = `
      <div class="card">
        <h3>${t('about.title')}</h3>
        <p class="card-subtitle">${t('about.copy')}</p>
      </div>
    `;
  },

  addUser() {
    const name = prompt('New user name');
    if (!name?.trim()) return;
    Storage.addUser(name.trim());
    Nav.render();
    this.renderUsers();
  },

  showUserSwitcher() {
    const config = Storage.getConfig();
    if (config.users.length <= 1) {
      alert('Only one user exists.');
      return;
    }
    const label = config.users.map((user, index) => `${index + 1}. ${user.name}${user.id === config.currentUserId ? ' (active)' : ''}`).join('\n');
    const choice = Number(prompt('Switch user:\n' + label));
    const user = config.users[choice - 1];
    if (user) {
      Storage.switchUser(user.id);
      Nav.render();
      if (this.currentTab === 'users') this.renderUsers();
    }
  },

  exportData() {
    const blob = new Blob([JSON.stringify(Storage.export(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'tsumori_export_' + new Date().toISOString().slice(0, 10) + '.json';
    link.click();
    URL.revokeObjectURL(url);
  },

  importData() {
    const file = document.getElementById('file-import').files[0];
    if (!file) {
      alert('Please select a JSON file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = event => {
      try {
        Storage.import(JSON.parse(event.target.result));
        alert('Data imported.');
        location.reload();
      } catch (error) {
        alert('Import failed: ' + error.message);
      }
    };
    reader.readAsText(file);
  },

  option(value, label, selected) {
    return `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`;
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

window.Settings = Settings;
