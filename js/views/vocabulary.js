const Vocabulary = {
  async init() {
    this.render();
    this.renderList();
  },

  render() {
    document.getElementById('main-content').innerHTML = `
      <header class="view-header">
        <h1>Vocabulary</h1>
        <p class="view-subtitle">Collect words and review them with spaced repetition.</p>
      </header>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-add-word">Add word</button>
        <button class="btn btn-secondary" id="btn-review">Review due words</button>
      </div>
      <div id="word-list"></div>
    `;
    document.getElementById('btn-add-word').addEventListener('click', () => this.showForm());
    document.getElementById('btn-review').addEventListener('click', () => this.startReview());
  },

  showForm(id) {
    const existing = id ? Storage.getById('vocabulary', id) : null;
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${existing ? 'Edit word' : 'Add word'}</h3>
        <button class="modal-close" onclick="Modal.close()">Close</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Word</label>
          <input class="form-input" id="input-word" value="${this.escapeAttr(existing?.word)}" placeholder="例: 積もり">
        </div>
        <div class="form-group">
          <label class="form-label">Reading</label>
          <input class="form-input" id="input-reading" value="${this.escapeAttr(existing?.reading)}" placeholder="つもり">
        </div>
        <div class="form-group">
          <label class="form-label">Meaning</label>
          <textarea class="form-input" id="input-meaning-jp" rows="2">${this.escapeHtml(existing?.meaningJp)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Chinese / notes</label>
          <textarea class="form-input" id="input-meaning-zh" rows="2">${this.escapeHtml(existing?.meaningZh)}</textarea>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-word">Save</button>
      </div>
    `;
    Modal.open();
    document.getElementById('btn-save-word').addEventListener('click', () => {
      const data = {
        word: document.getElementById('input-word').value.trim(),
        reading: document.getElementById('input-reading').value.trim(),
        meaningJp: document.getElementById('input-meaning-jp').value.trim(),
        meaningZh: document.getElementById('input-meaning-zh').value.trim()
      };
      if (!data.word) {
        alert('Please enter a word.');
        return;
      }
      if (existing) {
        Storage.update('vocabulary', id, data);
      } else {
        Storage.add('vocabulary', { ...data, ...SM2.initItem(), created: new Date().toISOString() });
      }
      Modal.close();
      this.renderList();
    });
  },

  startReview() {
    const due = SM2.getDue(Storage.getAll('vocabulary'));
    if (!due.length) {
      alert('No words are due right now.');
      return;
    }

    let index = 0;
    const show = () => {
      if (index >= due.length) {
        Modal.close();
        this.renderList();
        alert('Review complete.');
        return;
      }

      const item = due[index];
      document.getElementById('modal-container').innerHTML = `
        <div class="modal-header">
          <h3>Review ${index + 1} / ${due.length}</h3>
          <button class="modal-close" onclick="Modal.close()">Close</button>
        </div>
        <div class="modal-body review-card">
          <div class="review-word">${this.escapeHtml(item.word)}</div>
          <div class="review-reading">${this.escapeHtml(item.reading || '')}</div>
          <p>${this.escapeHtml(item.meaningZh || item.meaningJp || '')}</p>
        </div>
        <div class="modal-actions">
          <button class="btn btn-danger" data-result="again">Again</button>
          <button class="btn btn-secondary" data-result="hard">Hard</button>
          <button class="btn btn-primary" data-result="easy">Easy</button>
        </div>
      `;
      Modal.open();
      document.querySelectorAll('[data-result]').forEach(button => {
        button.addEventListener('click', () => {
          const stored = Storage.getById('vocabulary', item.id);
          if (button.dataset.result === 'again') SM2.incorrect(stored, 'again');
          if (button.dataset.result === 'hard') SM2.medium(stored, 'hard');
          if (button.dataset.result === 'easy') SM2.correct(stored, 'easy');
          Storage.update('vocabulary', stored.id, stored);
          index += 1;
          show();
        });
      });
    };

    show();
  },

  renderList() {
    const words = Storage.getAll('vocabulary').slice().reverse();
    const container = document.getElementById('word-list');
    if (!container) return;
    if (!words.length) {
      container.innerHTML = '<p class="empty-hint">No vocabulary yet. Add your first word.</p>';
      return;
    }

    container.innerHTML = words.map(word => `
      <div class="card word-card">
        <div class="card-header">
          <div>
            <strong>${this.escapeHtml(word.word)}</strong>
            <span class="card-subtitle">${this.escapeHtml(word.reading || '')}</span>
          </div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" data-edit="${word.id}">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${word.id}">Delete</button>
          </div>
        </div>
        <p>${this.escapeHtml(word.meaningJp || '')}</p>
        <p class="card-subtitle">${this.escapeHtml(word.meaningZh || '')}</p>
        <p class="card-subtitle">Mastery: ${Number(word.mastery || 0)} / 5</p>
      </div>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(button => {
      button.addEventListener('click', () => this.showForm(button.dataset.edit));
    });
    container.querySelectorAll('[data-delete]').forEach(button => {
      button.addEventListener('click', () => {
        if (confirm('Delete this word?')) {
          Storage.remove('vocabulary', button.dataset.delete);
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

window.Vocabulary = Vocabulary;
