/**
 * Phrases View 驤･?Phrase Book * 
 * 轢ｹ豌ｬ轢ｷ骰吶Ε蛟鍋菅繖ｧ蠕馴活謗誹・髏槫乱莉夐活螫ｨ竄ｬ? */

const Phrases = {
  async init() {
    this.render();
    this.bindEvents();
    this.renderList();
  },

  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <header class="view-header">
        <h1>Phrase Book</h1>
        <p class="view-subtitle">Collect and organize useful Japanese phrases</p>
      <</header>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-add-phrase">Add New Phrase</button>
      <</div>
      <div id="phrase-list"><</div>
    `;
  },

  bindEvents() {
    document.getElementById('btn-add-phrase').addEventListener('click', () => {
      this.showForm();
    });
  },

  showForm(editingId) {
    const existing = editingId ? Storage.getById('phrases', editingId) : null;
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${existing ? 'Edit Phrase' : 'Add Phrase}<</h3>
        <button class="modal-close" onclick="window.Modal.close()">Close</button>
      <</div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Japanese Phrase</label>
          <input class="form-input" id="input-jp" type="text" value="${existing ? existing.japanese : ''}" placeholder="貂壼ｬｶ邏ｰ驫・ｩょ雌蟋俶､ｼ莉ｹ驫・ｬ堺ｺｱ">
        <</div>
        <div class="form-group">
          <label class="form-label">Reading (Furigana)</label>
          <input class="form-input" id="input-reading" type="text" value="${existing ? existing.reading : ''}" placeholder="貂壼ｬｶ邏ｰ驫・ｨｿ莠ｽ驫域蝶莠ｶ驫・∽ｻ夐括?>
        <</div>
        <div class="form-group">
          <label class="form-label">Chinese Translation</label>
          <textarea class="form-input" id="input-zh" rows="2" placeholder="e.g., Thank you for your hard work.>${existing ? existing.chinese : ''}</textarea>
        <</div>
        <div class="form-group">
          <label class="form-label">Category<</label>
          <select class="form-input" id="input-category">
            <option value="greeting" ${existing?.category === 'greeting' ? 'selected' : ''}>Greeting<</option>
            <option value="daily" ${existing?.category === 'daily' ? 'selected' : ''}>Daily Life</option>
            <option value="business" ${existing?.category === 'business' ? 'selected' : ''}>Business・▲<</option>
            <option value="travel" ${existing?.category === 'travel' ? 'selected' : ''}>Travel</option>
          <</select>
        <</div>
      <</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-phrase">${existing ? 'Update' : 'Save}<</button>
      <</div>
    `;

    document.getElementById('btn-save-phrase').addEventListener('click', () => {
      const data = {
        japanese: document.getElementById('input-jp').value.trim(),
        reading: document.getElementById('input-reading').value.trim(),
        chinese: document.getElementById('input-zh').value.trim(),
        category: document.getElementById('input-category').value
      };
      if (!data.japanese) { alert('髀・Θ貉ｰ迹ｾ轤ｪ蛟ｰ骰上Η蟋城括讀ｼ莉ｸ驫・ｿ倶ｻｩ驫・尨莠・); return; }

      if (existing) {
        Storage.update('phrases', editingId, data);
      } else {
        Storage.add('phrases', { ...data, created: new Date().toISOString() });
      }

      Modal.close();
      this.renderList();
    });
  },

  renderList() {
    const items = Storage.getAll('phrases');
    const container = document.getElementById('phrase-list');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = '<p class="empty-hint">驫・ｿｱ莉ｩ骰吶Ε莠ｴ驫・ｘ蛟樣括菫ｱ莉憺活謦ｱ竄ｬ?</p>';
      return;
    }

    container.innerHTML = items.map(p => `
      <div class="card phrase-card">
        <div class="card-header">
          <div>
            <strong class="phrase-jp">${this.escapeHtml(p.japanese)}<</strong>
            <span class="card-subtitle">${this.escapeHtml(p.reading || '')}<</span>
          <</div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" data-edit="${p.id}" title="Edit">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${p.id}" title="骰灘ｩ・ｫ・>鬥・｣城粕?</button>
          <</div>
        <</div>
        <p class="phrase-zh">${this.escapeHtml(p.chinese || '')}<</p>
        <span class="badge badge-primary">${this.escapeHtml(p.category || '')}<</span>
      <</div>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(el => {
      el.addEventListener('click', () => this.showForm(el.dataset.edit));
    });

    container.querySelectorAll('[data-delete]').forEach(el => {
      el.addEventListener('click', () => {
        if (confirm('驫・蝶莨・甑繝｣蛟ｰ骰灘ｩ・ｫ朱括讀ｼ莨ｨ驫・ｬ堺ｺｱ髞・)) {
          Storage.remove('phrases', el.dataset.delete);
          this.renderList();
        }
      });
    });
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Phrases = Phrases;