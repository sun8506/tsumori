const Phrases = {
  async init() {
    this.render();
    this.renderList();
  },

  render() {
    document.getElementById('main-content').innerHTML = `
      <header class="view-header">
        <h1>Phrase Book</h1>
        <p class="view-subtitle">Save useful Japanese sentences and expressions.</p>
      </header>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-add-phrase">Add phrase</button>
      </div>
      <div id="phrase-list"></div>
    `;
    document.getElementById('btn-add-phrase').addEventListener('click', () => this.showForm());
  },

  showForm(id) {
    const existing = id ? Storage.getById('phrases', id) : null;
    document.getElementById('modal-container').innerHTML = `
      <div class="modal-header">
        <h3>${existing ? 'Edit phrase' : 'Add phrase'}</h3>
        <button class="modal-close" onclick="Modal.close()">Close</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Japanese</label>
          <textarea class="form-input" id="input-japanese" rows="2">${this.escapeHtml(existing?.japanese)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Reading</label>
          <input class="form-input" id="input-reading" value="${this.escapeAttr(existing?.reading)}">
        </div>
        <div class="form-group">
          <label class="form-label">Translation / notes</label>
          <textarea class="form-input" id="input-chinese" rows="2">${this.escapeHtml(existing?.chinese)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Category</label>
          <select class="form-input" id="input-category">
            ${['daily', 'greeting', 'business', 'travel', 'other'].map(value => `
              <option value="${value}" ${existing?.category === value ? 'selected' : ''}>${value}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-phrase">Save</button>
      </div>
    `;
    Modal.open();
    document.getElementById('btn-save-phrase').addEventListener('click', () => {
      const data = {
        japanese: document.getElementById('input-japanese').value.trim(),
        reading: document.getElementById('input-reading').value.trim(),
        chinese: document.getElementById('input-chinese').value.trim(),
        category: document.getElementById('input-category').value
      };
      if (!data.japanese) {
        alert('Please enter a phrase.');
        return;
      }
      if (existing) Storage.update('phrases', id, data);
      else Storage.add('phrases', { ...data, created: new Date().toISOString() });
      Modal.close();
      this.renderList();
    });
  },

  renderList() {
    const items = Storage.getAll('phrases').slice().reverse();
    const container = document.getElementById('phrase-list');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = '<p class="empty-hint">No phrases yet. Save one you want to reuse.</p>';
      return;
    }
    container.innerHTML = items.map(item => `
      <div class="card phrase-card">
        <div class="card-header">
          <div>
            <strong class="phrase-jp">${this.escapeHtml(item.japanese)}</strong>
            <span class="card-subtitle">${this.escapeHtml(item.reading || '')}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" data-edit="${item.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${item.id}">Delete</button>
          </div>
        </div>
        <p>${this.escapeHtml(item.chinese || '')}</p>
        <span class="badge badge-primary">${this.escapeHtml(item.category || 'other')}</span>
      </div>
    `).join('');
    container.querySelectorAll('[data-edit]').forEach(button => {
      button.addEventListener('click', () => this.showForm(button.dataset.edit));
    });
    container.querySelectorAll('[data-delete]').forEach(button => {
      button.addEventListener('click', () => {
        if (confirm('Delete this phrase?')) {
          Storage.remove('phrases', button.dataset.delete);
          this.renderList();
        }
      });
    });
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

window.Phrases = Phrases;
