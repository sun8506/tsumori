const Phrases = {
  reviewState: null,

  async init() {
    this.render();
    this.renderList();
  },

  render() {
    const dueCount = SM2.getDue(Storage.getAll('phrases')).length;
    document.getElementById('main-content').innerHTML = `
      <header class="view-header">
        <h1>${t('page.phrases')}</h1>
        <p class="view-subtitle">${t('phrases.subtitle')}</p>
      </header>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-add-phrase">${t('phrases.add')}</button>
        <button class="btn btn-secondary" id="btn-practice-phrase">${t('phrases.practice')}${dueCount ? ` (${dueCount})` : ''}</button>
      </div>
      <div id="phrase-list"></div>
    `;
    document.getElementById('btn-add-phrase').addEventListener('click', () => this.showForm());
    document.getElementById('btn-practice-phrase').addEventListener('click', () => this.startPractice());
  },

  showForm(id) {
    const existing = id ? Storage.getById('phrases', id) : null;
    const modal = document.getElementById('modal-container');
    modal.classList.remove('policy-modal');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${existing ? t('common.edit') : t('phrases.add')}</h3>
        <button class="modal-close" type="button" aria-label="${t('common.close')}" title="${t('common.close')}" id="phrase-form-close-btn">×</button>
      </div>
      <div class="modal-body phrase-form-body">
        <div class="form-group">
          <label class="form-label">${t('phrases.japanese')}</label>
          <textarea class="form-input" id="input-japanese" rows="2" placeholder="例：少々お待ちください">${this.escapeHtml(existing?.japanese)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">${t('words.reading')}</label>
          <input class="form-input" id="input-reading" value="${this.escapeAttr(existing?.reading)}" placeholder="しょうしょうおまちください">
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.translation')}</label>
          <textarea class="form-input" id="input-chinese" rows="2" placeholder="请稍等，我马上确认。">${this.escapeHtml(existing?.chinese)}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.industry')}</label>
          <select class="form-input" id="input-industry">
            ${this.industryOptions(existing?.industry || 'none')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.scene')}</label>
          <input class="form-input" id="input-scene" value="${this.escapeAttr(existing?.scene)}" placeholder="例：客服电话 / 门店接待 / 会议说明">
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.role')}</label>
          <input class="form-input" id="input-role" value="${this.escapeAttr(existing?.role)}" placeholder="例：对客户 / 对上级 / 对同事">
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.intent')}</label>
          <input class="form-input" id="input-intent" value="${this.escapeAttr(existing?.intent)}" placeholder="例：请求等待 / 确认信息 / 道歉">
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.tone')}</label>
          <select class="form-input" id="input-tone">
            ${this.toneOptions(existing?.tone || 'polite')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.variants')}</label>
          <textarea class="form-input" id="input-variants" rows="2" placeholder="少々お待ちください, 少しお待ちください">${this.escapeHtml(this.variantsToText(existing?.variants))}</textarea>
        </div>
        <div class="form-group">
          <label class="form-label">${t('phrases.category')}</label>
          <select class="form-input" id="input-category">
            ${['daily', 'greeting', 'business', 'travel', 'other'].map(value => `
              <option value="${value}" ${existing?.category === value ? 'selected' : ''}>${t(`category.${value}`)}</option>
            `).join('')}
          </select>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary" type="button" id="phrase-form-cancel-btn">${t('common.cancel')}</button>
        <button class="btn btn-primary" id="btn-save-phrase">${t('common.save')}</button>
      </div>
    `;
    this.openModal();
    const closeModal = () => this.closeModal();
    document.getElementById('phrase-form-close-btn')?.addEventListener('click', closeModal);
    document.getElementById('phrase-form-cancel-btn')?.addEventListener('click', closeModal);
    document.getElementById('btn-save-phrase').addEventListener('click', () => {
      const data = {
        japanese: document.getElementById('input-japanese').value.trim(),
        reading: document.getElementById('input-reading').value.trim(),
        chinese: document.getElementById('input-chinese').value.trim(),
        industry: document.getElementById('input-industry').value,
        scene: document.getElementById('input-scene').value.trim(),
        role: document.getElementById('input-role').value.trim(),
        intent: document.getElementById('input-intent').value.trim(),
        tone: document.getElementById('input-tone').value,
        variants: this.parseList(document.getElementById('input-variants').value),
        category: document.getElementById('input-category').value
      };
      if (!data.japanese) {
        alert(t('phrases.required'));
        return;
      }
      if (existing) {
        Storage.update('phrases', id, data);
      } else {
        Storage.add('phrases', {
          ...data,
          ...SM2.initItem(),
          created: new Date().toISOString()
        });
      }
      this.closeModal();
      this.renderList();
    });
  },

  startPractice() {
    const due = SM2.getDue(Storage.getAll('phrases'));
    if (!due.length) {
      alert(t('phrases.noDue'));
      return;
    }

    this.reviewState = {
      queue: due.map(item => item.id),
      relearnQueue: [],
      answered: 0,
      total: due.length,
      phase: 'review'
    };

    const show = () => {
      const state = this.reviewState;
      if (!state) return;
      if (!state.queue.length && state.relearnQueue.length) {
        state.phase = 'relearn';
        state.queue = state.relearnQueue.splice(0);
      }
      if (!state.queue.length) {
        this.finishPractice();
        return;
      }

      const item = Storage.getById('phrases', state.queue.shift());
      if (!item) {
        show();
        return;
      }
      const progress = state.phase === 'relearn'
        ? `${t('phrases.practice')} ${state.answered + 1}`
        : `${t('phrases.practice')} ${state.answered + 1} / ${state.total}`;
      const prompt = this.buildPrompt(item);
      document.getElementById('modal-container').innerHTML = `
        <div class="modal-header">
          <h3>${progress}</h3>
          <button class="modal-close" type="button" aria-label="${t('common.close')}" title="${t('common.close')}" id="phrase-practice-close-btn">×</button>
        </div>
        <div class="modal-body phrase-practice-card">
          <p class="review-mode-label">${t('phrases.prompt', { context: this.escapeHtml(prompt) })}</p>
          <div class="phrase-prompt-card">
            <div class="phrase-prompt">${this.escapeHtml(item.chinese || item.japanese || '')}</div>
            <div class="phrase-prompt-meta">
              ${this.renderPill(t('phrases.industry'), this.industryLabel(item.industry))}
              ${item.scene ? this.renderPill(t('phrases.scene'), item.scene) : ''}
              ${item.role ? this.renderPill(t('phrases.role'), item.role) : ''}
              ${item.intent ? this.renderPill(t('phrases.intent'), item.intent) : ''}
              ${item.tone ? this.renderPill(t('phrases.tone'), this.toneLabel(item.tone)) : ''}
            </div>
            <div class="phrase-reference">${t('phrases.reference')}: ${this.escapeHtml(item.japanese)}</div>
          </div>
          <form id="phrase-practice-form" class="review-answer-form" autocomplete="off">
            <label class="form-label" for="phrase-practice-answer">${t('phrases.enterAnswer')}</label>
            <input class="form-input review-answer-input" id="phrase-practice-answer" inputmode="text" autocomplete="off" autocapitalize="none" placeholder="少々お待ちください">
            <p class="review-feedback" id="phrase-practice-feedback" aria-live="polite"></p>
          </form>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="phrase-practice-show-btn" type="button">${t('phrases.showAnswer')}</button>
          <button class="btn btn-primary" id="phrase-practice-submit-btn" type="submit" form="phrase-practice-form">${t('phrases.submit')}</button>
        </div>
      `;
      this.openModal();
      const closePractice = () => this.closeModal();
      document.getElementById('phrase-practice-close-btn')?.addEventListener('click', closePractice);
      const input = document.getElementById('phrase-practice-answer');
      const feedback = document.getElementById('phrase-practice-feedback');
      const submitButton = document.getElementById('phrase-practice-submit-btn');
      const showButton = document.getElementById('phrase-practice-show-btn');
      let waitingForNext = false;

      const goNext = () => {
        if (waitingForNext) {
          state.answered += 1;
          show();
        }
      };

      const finishQuestion = result => {
        if (waitingForNext && result === 'wrong') return;
        const stored = Storage.getById('phrases', item.id);
        if (!stored) return;
        const response = input.value.trim();
        if (result === 'correct') {
          SM2.correct(stored, response);
          stored.needsRelearn = false;
          Storage.update('phrases', stored.id, stored);
          feedback.className = 'review-feedback is-correct';
          feedback.textContent = t('phrases.correct');
          submitButton.disabled = true;
          showButton.disabled = true;
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
        Storage.update('phrases', stored.id, stored);
        if (!state.relearnQueue.includes(stored.id)) state.relearnQueue.push(stored.id);
        feedback.className = 'review-feedback is-wrong';
        feedback.innerHTML = t('phrases.wrong', {
          answer: `<strong>${this.escapeHtml(stored.japanese)}</strong>`
        });
        submitButton.disabled = true;
        waitingForNext = true;
        showButton.textContent = t('phrases.next');
        showButton.disabled = false;
      };

      document.getElementById('phrase-practice-form').addEventListener('submit', event => {
        event.preventDefault();
        if (submitButton.disabled) return;
        const response = input.value.trim();
        if (!response) {
          feedback.className = 'review-feedback is-wrong';
          feedback.textContent = t('phrases.required');
          input.focus();
          return;
        }
        finishQuestion(this.isPhraseAnswerCorrect(response, item) ? 'correct' : 'wrong');
      });

      showButton.addEventListener('click', () => waitingForNext ? goNext() : finishQuestion('wrong'));
      input.focus();
    };

    show();
  },

  finishPractice() {
    const reviewed = this.reviewState?.answered || 0;
    this.reviewState = null;
    this.closeModal();
    this.renderList();
    alert(`${t('phrases.practice')} ${reviewed}`);
  },

  isPhraseAnswerCorrect(answer, item) {
    const normalizedAnswer = this.normalizeSentence(answer);
    if (!normalizedAnswer) return false;
    return this.phraseCandidates(item).some(candidate => this.normalizeSentence(candidate) === normalizedAnswer);
  },

  phraseCandidates(item) {
    const fields = [item.japanese, item.variants, item.reading];
    return fields
      .flatMap(value => Array.isArray(value) ? value : String(value || '').split(/[、,，;；/／\n]+/))
      .map(value => String(value || '').trim())
      .filter(Boolean);
  },

  normalizeSentence(value) {
    return String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '')
      .replace(/[・･.,，、。!！?？'"`“”‘’()（）[\]【】{}<>〈〉《》:：;；\-—]/g, '');
  },

  buildPrompt(item) {
    const parts = [];
    if (item.industry && item.industry !== 'none') parts.push(`${t('phrases.industry')}：${this.industryLabel(item.industry)}`);
    if (item.scene) parts.push(`${t('phrases.scene')}：${item.scene}`);
    if (item.role) parts.push(`${t('phrases.role')}：${item.role}`);
    if (item.intent) parts.push(`${t('phrases.intent')}：${item.intent}`);
    if (item.tone) parts.push(`${t('phrases.tone')}：${this.toneLabel(item.tone)}`);
    if (!parts.length) return item.chinese || item.japanese || '';
    return parts.join(' / ');
  },

  renderList() {
    const items = Storage.getAll('phrases').slice().reverse();
    const container = document.getElementById('phrase-list');
    if (!container) return;
    if (!items.length) {
      container.innerHTML = `<p class="empty-hint">${t('phrases.empty')}</p>`;
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
            <button class="btn btn-secondary btn-sm" data-edit="${item.id}">${t('common.edit')}</button>
            <button class="btn btn-danger btn-sm" data-delete="${item.id}">${t('common.delete')}</button>
          </div>
        </div>
        <p>${this.escapeHtml(item.chinese || '')}</p>
        <div class="phrase-tag-list">
          ${this.renderPill(t('phrases.category'), t(`category.${item.category || 'other'}`))}
          ${item.industry && item.industry !== 'none' ? this.renderPill(t('phrases.industry'), this.industryLabel(item.industry)) : ''}
          ${item.scene ? this.renderPill(t('phrases.scene'), item.scene) : ''}
          ${item.role ? this.renderPill(t('phrases.role'), item.role) : ''}
          ${item.intent ? this.renderPill(t('phrases.intent'), item.intent) : ''}
          ${item.tone ? this.renderPill(t('phrases.tone'), this.toneLabel(item.tone)) : ''}
          ${item.variants?.length ? this.renderPill(t('phrases.variants'), String(item.variants.length)) : ''}
        </div>
        <p class="card-subtitle">${t('words.mastery')}: ${Number(item.mastery || 0)} / 5</p>
      </div>
    `).join('');

    container.querySelectorAll('[data-edit]').forEach(button => {
      button.addEventListener('click', () => this.showForm(button.dataset.edit));
    });
    container.querySelectorAll('[data-delete]').forEach(button => {
      button.addEventListener('click', () => {
        if (confirm(t('phrases.deleteConfirm'))) {
          Storage.remove('phrases', button.dataset.delete);
          this.renderList();
        }
      });
    });
  },

  renderPill(label, value) {
    if (!value) return '';
    return `<span class="phrase-pill"><strong>${this.escapeHtml(label)}</strong><span>${this.escapeHtml(value)}</span></span>`;
  },

  industryOptions(selected) {
    const options = ['none', 'it', 'sales', 'realestate', 'hospitality', 'food', 'service', 'education', 'manufacturing'];
    return options.map(value => `
      <option value="${value}" ${selected === value ? 'selected' : ''}>${t(`industry.${value}`)}</option>
    `).join('');
  },

  toneOptions(selected) {
    const options = [
      { value: 'casual', label: 'casual' },
      { value: 'polite', label: 'polite' },
      { value: 'honorific', label: 'honorific' }
    ];
    return options.map(option => `
      <option value="${option.value}" ${selected === option.value ? 'selected' : ''}>${option.label}</option>
    `).join('');
  },

  industryLabel(value) {
    return t(`industry.${value || 'none'}`);
  },

  toneLabel(value) {
    const map = {
      casual: 'casual',
      polite: 'polite',
      honorific: 'honorific'
    };
    return map[value] || value || '';
  },

  parseList(value) {
    return String(value || '')
      .split(/[、,，;；/／\n]+/)
      .map(item => item.trim())
      .filter(Boolean);
  },

  variantsToText(value) {
    if (Array.isArray(value)) return value.join(', ');
    return value || '';
  },

  openModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'flex';
  },

  closeModal() {
    const overlay = document.getElementById('modal-overlay');
    if (overlay) overlay.style.display = 'none';
    document.getElementById('modal-container')?.classList.remove('policy-modal');
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
