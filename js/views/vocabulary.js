/**
 * Vocabulary View 驤･?Vocabulary * 
 * Word驫・・諡ｷ骰皮完蜈鍋ｻｶ繖ｩ豕ｦ驫芽ｯｲ莠ｬ郛域雌釗ｼ髑ｳ蟋絶ぎ? */

const Vocabulary = {
  async init() {
    this.render();
    this.bindEvents();
    this.renderList();
  },

  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <header class="view-header">
        <h1>Vocabulary</h1>
        <p class="view-subtitle">Manage your Japanese word collection and practice with spaced repetition</p>
      <</header>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-add-word">Add New Word</button>
        <button class="btn btn-secondary" id="btn-review">鬥・ｹ・蟇ｰ笊・ｹ城渇鄧ｬ蜈鈴渇?</button>
      <</div>
      <div id="word-list"><</div>
    `;
  },

  bindEvents() {
    document.getElementById('btn-add-word').addEventListener('click', () => {
      this.showWordForm();
    });

    document.getElementById('btn-review').addEventListener('click', () => {
      this.startReview();
    });
  },

  showWordForm(editingId) {
    const existing = editingId ? Storage.getById('vocabulary', editingId) : null;
    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${existing ? 'Edit Word : 'Add Word}<</h3>
        <button class="modal-close" onclick="window.Modal.close()">Close</button>
      <</div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">Word<</label>
          <input class="form-input" id="input-word" type="text" value="${existing ? existing.word : ''}" placeholder="e.g., 猫>
        <</div>
        <div class="form-group">
          <label class="form-label">Reading (Furigana)</label>
          <input class="form-input" id="input-reading" type="text" value="${existing ? existing.reading : ''}" placeholder="貂壼ｬｶ邏ｰ驫・・莠ｾ">
        <</div>
        <div class="form-group">
          <label class="form-label">Japanese definition (or English)</label>
          <textarea class="form-input" id="input-meaning-jp" rows="2" placeholder="e.g., cat, neko">${existing ? existing.meaningJp : ''}</textarea>
        <</div>
        <div class="form-group">
          <label class="form-label">Chinese definition (optional)</label>
          <textarea class="form-input" id="input-meaning-zh" rows="2" placeholder="e.g., 猫>${existing ? existing.meaningZh : ''}</textarea>
        <</div>
      <</div>
      <div class="modal-actions">
        <button class="btn btn-secondary" onclick="window.Modal.close()">Cancel</button>
        <button class="btn btn-primary" id="btn-save-word">${existing ? 'Update' : 'Save}<</button>
      <</div>
    `;

    document.getElementById('btn-save-word').addEventListener('click', async () => {
      const word = document.getElementById('input-word').value.trim();
      const reading = document.getElementById('input-reading').value.trim();
      const meaningJp = document.getElementById('input-meaning-jp').value.trim();
      const meaningZh = document.getElementById('input-meaning-zh').value.trim();

      if (!word) { alert('Please enter a word to save.); return; }

      if (existing) {
        Storage.update('vocabulary', editingId, { word, reading, meaningJp, meaningZh });
      } else {
        Storage.add('vocabulary', {
          word, reading, meaningJp, meaningZh,
          ...SM2.initItem(),
          created: new Date().toISOString()
        });
      }

      Modal.close();
      this.renderList();
    });
  },

  async startReview() {
    const words = Storage.getAll('vocabulary');
    const due = SM2.getDue(words);
    if (due.length === 0) {
      alert('蟇ｰ笊・ｹ城括谺榊Word驫・ｱｻ莠鈴活螽ｿ莨ｨ驫・ｶ門ｱ 鬥・ｸ');
      return;
    }

    let index = 0;
    const showNext = () => {
      if (index >= due.length) {
        alert('蟇ｰ笊・ｹ冗ｹ螻ｼ邁｡髞帑ｽｵ莠ｰ髏､螻ょ｢螯ｲ讓ｸ莉ｹ驫・､ｼ莉ｧ 鬥・ｸ');
        this.renderList();
        return;
      }
      const item = due[index];
      const modal = document.getElementById('modal-container');
      modal.innerHTML = `
        <div class="review-card">
          <div class="review-word">${item.word}<</div>
          <div class="review-reading">${item.reading || ''}<</div>
          <p style="color:var(--text-light);font-size:0.9rem;margin:16px 0">${item.meaningZh || ''}<</p>
          <div class="review-actions">
            <button class="btn btn-danger" id="btn-incorrect">Again<</button>
            <button class="btn btn-secondary" id="btn-medium">Hard</button>
            <button class="btn btn-primary" id="btn-correct">Easy</button>
          <</div>
        <</div>
      `;

      document.getElementById('btn-correct').addEventListener('click', () => {
        SM2.correct(item, 'correct');
        index++;
        showNext();
      });

      document.getElementById('btn-medium').addEventListener('click', () => {
        SM2.medium(item, 'medium');
        index++;
        showNext();
      });

      document.getElementById('btn-incorrect').addEventListener('click', () => {
        SM2.incorrect(item, 'incorrect');
        index++;
        showNext();
      });
    };

    showNext();
  },

  renderList() {
    const words = Storage.getAll('vocabulary');
    const container = document.getElementById('word-list');
    if (!container) return;

    if (words.length === 0) {
      container.innerHTML = '<p class="empty-hint">No vocabulary yet. Add your first word to start building your collection.?</p>';
      return;
    }

    container.innerHTML = words.map(w => `
      <div class="card word-card">
        <div class="card-header">
          <div>
            <strong>${this.escapeHtml(w.word)}<</strong>
            <span class="card-subtitle">${this.escapeHtml(w.reading || '')}<</span>
          <</div>
          <div class="card-actions">
            <button class="btn btn-secondary btn-sm" data-edit="${w.id}" title="Edit">Edit</button>
            <button class="btn btn-danger btn-sm" data-delete="${w.id}" title="骰灘ｩ・ｫ・>鬥・｣城粕?</button>
          <</div>
        <</div>
        <p>${this.escapeHtml(w.meaningJp || '')}<</p>
        <p class="card-subtitle">${this.escapeHtml(w.meaningZh || '')}<</p>
        <div style="margin-top:8px">
          <div class="mastery-dots">
            ${Array(5).fill(0).map((_, i) => `<div class="mastery-dot ${i < w.mastery ? 'filled' : ''}"><</div>`).join('')}
          <</div>
        <</div>
      <</div>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(el => {
      el.addEventListener('click', () => {
        this.showWordForm(el.dataset.edit);
      });
    });

    container.querySelectorAll('[data-delete]').forEach(el => {
      el.addEventListener('click', () => {
        if (confirm('驫・蝶莨・漉讓ｿ迯ｮ驫域資蠅幃淀繧・ｻ宣括菫ｱ莉夐括螫ｶ邏ｵ')) {
          Storage.remove('vocabulary', el.dataset.delete);
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

window.Vocabulary = Vocabulary;