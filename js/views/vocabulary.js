const Vocabulary = {
  reviewState: null,

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
        <button class="modal-close" type="button" aria-label="Close" title="Close" id="word-form-close-btn">×</button>
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
          <label class="form-label">Accepted spellings</label>
          <input class="form-input" id="input-aliases" value="${this.escapeAttr(this.aliasesToText(existing?.aliases))}" placeholder="カタカナ、别读、其他拼写，用逗号分隔">
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
    const hideModal = () => {
      const overlay = document.getElementById('modal-overlay');
      if (overlay) overlay.style.display = 'none';
      document.getElementById('modal-container')?.classList.remove('policy-modal');
    };
    document.getElementById('word-form-close-btn')?.addEventListener('click', hideModal);
    document.getElementById('btn-save-word').addEventListener('click', () => {
      const data = {
        word: document.getElementById('input-word').value.trim(),
        reading: document.getElementById('input-reading').value.trim(),
        aliases: this.parseAliases(document.getElementById('input-aliases').value),
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

    this.reviewState = {
      queue: due.map(item => item.id),
      relearnQueue: [],
      answered: 0,
      total: due.length,
      phase: 'review',
      currentId: null
    };

    const show = () => {
      const state = this.reviewState;
      if (!state) return;
      if (!state.queue.length && state.relearnQueue.length) {
        state.phase = 'relearn';
        state.queue = state.relearnQueue.splice(0);
      }
      if (!state.queue.length) {
        this.finishReview();
        return;
      }

      const item = Storage.getById('vocabulary', state.queue.shift());
      if (!item) {
        show();
        return;
      }
      state.currentId = item.id;
      const progress = state.phase === 'relearn'
        ? `Relearn ${state.answered + 1}`
        : `Review ${state.answered + 1} / ${state.total}`;
      document.getElementById('modal-container').innerHTML = `
        <div class="modal-header">
          <h3>${progress}</h3>
        <button class="modal-close" type="button" aria-label="Close" title="Close" id="review-close-btn">×</button>
        </div>
        <div class="modal-body review-card spelling-review-card">
          <p class="review-mode-label">根据单词写出读音。可输入平假名或片假名。</p>
          <div class="review-word">${this.escapeHtml(item.word)}</div>
          <p class="review-hint">${this.escapeHtml(item.meaningZh || item.meaningJp || '')}</p>
          <form id="review-answer-form" class="review-answer-form" autocomplete="off">
            <label class="form-label" for="review-answer">读音 / 拼写</label>
            <input class="form-input review-answer-input" id="review-answer" inputmode="text" autocomplete="off" autocapitalize="none" placeholder="例：きゅうそく / キュウソク">
            <p class="review-feedback" id="review-feedback" aria-live="polite"></p>
          </form>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="btn-show-answer" type="button">看答案</button>
          <button class="btn btn-primary" id="btn-submit-review" type="submit" form="review-answer-form">确认</button>
        </div>
      `;
      Modal.open();
      document.getElementById('review-close-btn')?.addEventListener('click', () => {
        const overlay = document.getElementById('modal-overlay');
        if (overlay) overlay.style.display = 'none';
        document.getElementById('modal-container')?.classList.remove('policy-modal');
      });
      const input = document.getElementById('review-answer');
      const feedback = document.getElementById('review-feedback');
      const submitButton = document.getElementById('btn-submit-review');
      const showAnswerButton = document.getElementById('btn-show-answer');
      let waitingForNext = false;
      const finishQuestion = result => {
        if (waitingForNext && result === 'wrong') return;
        const stored = Storage.getById('vocabulary', item.id);
        if (!stored) return;
        const response = input.value.trim();
        if (result === 'correct') {
          SM2.correct(stored, response);
          stored.needsRelearn = false;
          Storage.update('vocabulary', stored.id, stored);
          feedback.className = 'review-feedback is-correct';
          feedback.textContent = '正确，进入下一题。';
          submitButton.disabled = true;
          showAnswerButton.disabled = true;
          setTimeout(() => {
            state.answered += 1;
            show();
          }, 500);
          return;
        }

        SM2.incorrect(stored, response);
        stored.needsRelearn = true;
        stored.lapses = Number(stored.lapses || 0) + 1;
        stored.nextReview = new Date().toISOString();
        Storage.update('vocabulary', stored.id, stored);
        if (!state.relearnQueue.includes(stored.id)) state.relearnQueue.push(stored.id);
        feedback.className = 'review-feedback is-wrong';
        feedback.innerHTML = `不正确。正确读音：<strong>${this.escapeHtml(stored.reading || stored.word)}</strong>`;
        submitButton.disabled = true;
        waitingForNext = true;
        showAnswerButton.textContent = '下一题';
        showAnswerButton.disabled = false;
      };

      const goNext = () => {
        if (waitingForNext) {
          state.answered += 1;
          show();
        }
      };

      document.getElementById('review-answer-form').addEventListener('submit', event => {
        event.preventDefault();
        if (submitButton.disabled) return;
        const response = input.value.trim();
        if (!response) {
          feedback.className = 'review-feedback is-wrong';
          feedback.textContent = '请输入答案。';
          input.focus();
          return;
        }
        finishQuestion(this.isReadingAnswerCorrect(response, item) ? 'correct' : 'wrong');
      });
      showAnswerButton.addEventListener('click', () => waitingForNext ? goNext() : finishQuestion('wrong'));
      input.focus();
    };

    show();
  },

  finishReview() {
    const reviewed = this.reviewState?.answered || 0;
    this.reviewState = null;
    Modal.close();
    this.renderList();
    alert(`复习完成。本轮处理 ${reviewed} 次。`);
  },

  isReadingAnswerCorrect(answer, item) {
    const normalizedAnswer = this.normalizeReading(answer);
    if (!normalizedAnswer) return false;
    return this.answerCandidates(item).some(candidate => this.normalizeReading(candidate) === normalizedAnswer);
  },

  answerCandidates(item) {
    const fields = [item.reading, item.word, item.kana, item.spelling, item.aliases];
    return fields
      .flatMap(value => Array.isArray(value) ? value : String(value || '').split(/[、,，;；/／\s]+/))
      .map(value => String(value || '').trim())
      .filter(Boolean);
  },

  normalizeReading(value) {
    return String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[・･.,，、。'’`´ー－-]/g, '')
      .replace(/[\u30A1-\u30F6]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60));
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
        ${word.aliases?.length ? `<p class="card-subtitle">Accepted: ${this.escapeHtml(word.aliases.join(' / '))}</p>` : ''}
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

  parseAliases(value) {
    return String(value || '')
      .split(/[、,，;；/／\n]+/)
      .map(item => item.trim())
      .filter(Boolean);
  },

  aliasesToText(value) {
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
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
