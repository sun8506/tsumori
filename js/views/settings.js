/** Settings View */

const Settings = {
  currentTab: 'users',
  async init() { this.render(); this.renderUserList(); this.loadConfig(); },
  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <header class="view-header"><h1>Settings</h1><p class="view-subtitle">Account and app settings</p></header>
      <div class="settings-tabs">
        <button class="settings-tab active" data-tab="users">Users</button>
        <button class="settings-tab" data-tab="data">Data</button>
        <button class="settings-tab" data-tab="profile">Profile</button>
        <button class="settings-tab" data-tab="expert">Expert</button>
        <button class="settings-tab" data-tab="about">About</button>
      </div>
      <div id="settings-body"></div>
    `;
    this.bindTabEvents(); this.showTab('users');
  },
  bindTabEvents() {
    document.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active'); this.showTab(tab.dataset.tab);
      });
    });
  },
  showTab(tab) {
    this.currentTab = tab;
    const body = document.getElementById('settings-body');
    if (!body) return;
    const config = JSON.parse(Storage.get('_config') || '{}');
    const uid = config.currentUserId;
    if (tab === 'users') {
      body.innerHTML = '<div id="user-list"></div><button class="btn btn-primary" id="btn-add-user" style="margin-top:12px">Add New User</button>';
      this.renderUserList();
      document.getElementById('btn-add-user').addEventListener('click', () => this.addUser());
    } else if (tab === 'data') {
      body.innerHTML = `
        <div class="card"><h3 style="margin-bottom:12px">Export</h3><p class="card-subtitle">Export all data as JSON</p><button class="btn btn-primary" id="btn-export">Export Data</button></div>
        <div class="card" style="margin-top:12px"><h3 style="margin-bottom:12px">Import</h3><p class="card-subtitle">Restore data from JSON</p><input type="file" id="file-import" accept=".json" style="margin-bottom:8px"><button class="btn btn-secondary" id="btn-import">Import Data</button></div>
        <div class="card" style="margin-top:12px"><h3 style="margin-bottom:12px;color:var(--danger)">Clear All Data</h3><button class="btn btn-danger" id="btn-clear">Delete All</button></div>
      `;
      this.bindDataEvents();
    } else if (tab === 'about') {
      body.innerHTML = '<div class="card"><h3>About Tsumori</h3><p class="card-subtitle" style="margin-top:8px">Japanese learning toolkit</p><div style="margin-top:16px"><p><strong>Version:</strong> 1.0.0</p><p style="margin-top:4px"><strong>Features:</strong></p><ul style="margin-top:4px;padding-left:20px;line-height:2"><li>SM-2 spaced repetition</li><li>NHK News Web Easy</li><li>Speech recognition</li><li>Multi-user support</li><li>AI expert explanations</li></ul></div></div>';
    } else if (tab === 'profile') {
      const p = Storage.getUserProfile(uid); const pr = p.profile || {};
      const lv = pr.level || 'n3';
      body.innerHTML = `
        <div class="card"><h3 style="margin-bottom:12px">Learner Profile</h3>
        <div class="form-group"><label class="form-label">Explanation Language</label><select class="form-input" id="input-language">
          <option value="zh" ${pr.language==='zh'?'selected':''}>Chinese</option>
          <option value="en" ${pr.language==='en'?'selected':''}>English</option>
          <option value="zh-en" ${pr.language==='zh-en'?'selected':''}>Chinese + English</option>
          <option value="ja-zh" ${pr.language==='ja-zh'?'selected':''}>Japanese + Chinese</option>
        </select></div>
        <div class="form-group"><label class="form-label">Industry</label><select class="form-input" id="input-industry">
          <option value="none" ${pr.industry==='none'?'selected':''}>General</option>
          <option value="it" ${pr.industry==='it'?'selected':''}>IT / Tech</option>
          <option value="sales" ${pr.industry==='sales'?'selected':''}>Sales</option>
          <option value="realestate" ${pr.industry==='realestate'?'selected':''}>Real Estate</option>
          <option value="hospitality" ${pr.industry==='hospitality'?'selected':''}>Hospitality</option>
          <option value="food" ${pr.industry==='food'?'selected':''}>Food &amp; Beverage</option>
          <option value="service" ${pr.industry==='service'?'selected':''}>Service</option>
          <option value="education" ${pr.industry==='education'?'selected':''}>Education</option>
          <option value="manufacturing" ${pr.industry==='manufacturing'?'selected':''}>Manufacturing</option>
        </select></div>
        <div class="form-group"><label class="form-label">Japanese Level</label><select class="form-input" id="input-level">
          <option value="n5" ${lv==='n5'?'selected':''}>N5 (Beginner)</option>
          <option value="n4" ${lv==='n4'?'selected':''}>N4 (Elementary)</option>
          <option value="n3" ${lv==='n3'?'selected':''}>N3 (Intermediate)</option>
          <option value="n2" ${lv==='n2'?'selected':''}>N2 (Upper-Intermediate)</option>
          <option value="n1" ${lv==='n1'?'selected':''}>N1 (Advanced)</option>
          <option value="free" ${lv==='free'?'selected':''}>Free</option>
        </select></div>
        <button class="btn btn-primary" id="btn-save-profile">Save Profile</button></div>
      `;
      document.getElementById('btn-save-profile').addEventListener('click', () => {
        const l = document.getElementById('input-language').value;
        const i = document.getElementById('input-industry').value;
        const lv2 = document.getElementById('input-level').value;
        Storage.updateUserProfile(uid, { profile: { language: l, industry: i, level: lv2 } });
        alert('Profile updated');
      });
    } else if (tab === 'expert') {
      const s = (Storage.getUserProfile(uid).settings) || {};
      const aa = s.autoAddToVocab || false;
      const se = s.showExamples !== false;
      const sg = s.showGrammar !== false;
      const me = s.maxExamples || 3;
      body.innerHTML = `
        <div class="card"><h3 style="margin-bottom:12px">Expert Settings</h3>
        <div class="form-group"><label class="form-label"><input type="checkbox" id="chk-auto-vocab" ${aa?'checked':''}> Auto-add to vocabulary</label></div>
        <div class="form-group"><label class="form-label"><input type="checkbox" id="chk-show-examples" ${se?'checked':''}> Show example sentences</label></div>
        <div class="form-group"><label class="form-label"><input type="checkbox" id="chk-show-grammar" ${sg?'checked':''}> Show grammar notes</label></div>
        <div class="form-group"><label class="form-label">Max examples</label><select class="form-input" id="input-max-examples">
          <option value="1" ${me===1?'selected':''}>1</option><option value="2" ${me===2?'selected':''}>2</option>
          <option value="3" ${me===3?'selected':''}>3</option><option value="4" ${me===4?'selected':''}>4</option>
          <option value="5" ${me===5?'selected':''}>5</option>
        </select></div>
        <button class="btn btn-primary" id="btn-save-expert-settings">Save Settings</button></div>
      `;
      document.getElementById('btn-save-expert-settings').addEventListener('click', () => {
        Storage.updateUserProfile(uid, { settings: {
          autoAddToVocab: document.getElementById('chk-auto-vocab').checked,
          showExamples: document.getElementById('chk-show-examples').checked,
          showGrammar: document.getElementById('chk-show-grammar').checked,
          maxExamples: parseInt(document.getElementById('input-max-examples').value)
        }});
        alert('Settings updated');
      });
    }
  },
  renderUserList() {
    const config = JSON.parse(Storage.get('_config') || '{}');
    const users = config.users || [];
    const currentId = config.currentUserId;
    const list = document.getElementById('user-list');
    if (!list) return;
    if (users.length === 0) { list.innerHTML = '<p class="empty-hint">No users</p>'; return; }
    list.innerHTML = users.map(u => `
      <div class="card ${u.id===currentId?'user-card-current':''}" data-user-id="${u.id}">
        <div class="card-header"><strong>${this.escapeHtml(u.name)}</strong><span class="badge badge-primary">${u.id===currentId?'Active':''}</span></div>
        <p class="card-subtitle">Words: ${Storage.count('vocabulary')}</p>
      </div>
    `).join('');
  },
  async addUser() {
    const name = prompt('Enter new username');
    if (!name || !name.trim()) return;
    const config = JSON.parse(Storage.get('_config') || '{}');
    config.users = config.users || [];
    config.users.push({ id: 'user_' + Date.now(), name: name.trim() });
    if (!config.currentUserId) config.currentUserId = config.users[0].id;
    Storage.set('_config', JSON.stringify(config));
    this.renderUserList();
  },
  async showUserSwitcher() {
    const config = JSON.parse(Storage.get('_config') || '{}');
    const users = config.users || [];
    if (users.length < 2) { if(users.length===1) document.getElementById('nav-user-name').textContent=users[0].name; this.renderUserList(); return; }
    const name = users.map((u,i) => `${i+1}. ${u.name}${u.id===config.currentUserId?' (Active)':''}`).join('\n');
    const choice = prompt('Switch user:\n' + name);
    if (!choice) return;
    const idx = parseInt(choice) - 1;
    if (idx >= 0 && idx < users.length) {
      config.currentUserId = users[idx].id;
      Storage.set('_config', JSON.stringify(config));
      document.getElementById('nav-user-name').textContent = users[idx].name;
      this.renderUserList();
    }
  },
  bindDataEvents() {
    document.getElementById('btn-export').addEventListener('click', () => {
      const data = Storage.export();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = 'tsumori_export_' + new Date().toISOString().slice(0,10) + '.json';
      a.click(); URL.revokeObjectURL(url);
    });
    document.getElementById('btn-import').addEventListener('click', () => {
      const fi = document.getElementById('file-import');
      const file = fi.files[0];
      if (!file) { alert('Please select a file'); return; }
      const reader = new FileReader();
      reader.onload = (e) => { try { Storage.import(JSON.parse(e.target.result)); alert('Data imported'); location.reload(); } catch(err) { alert('Import failed: ' + err.message); } };
      reader.readAsText(file);
    });
    document.getElementById('btn-clear').addEventListener('click', () => {
      if (confirm('Delete ALL data and settings?')) {
        if (confirm('This cannot be undone. Delete everything?')) {
          localStorage.clear(); alert('All cleared. Reloading...'); location.reload();
        }
      }
    });
  },
  loadConfig() {
    const config = JSON.parse(Storage.get('_config') || '{}');
    const user = (config.users||[]).find(u => u.id === config.currentUserId);
    if (user) document.getElementById('nav-user-name').textContent = user.name;
  },
  escapeHtml(text) { if (!text) return ''; const d=document.createElement('div'); d.textContent=text; return d.innerHTML; }
};
window.Settings = Settings;
