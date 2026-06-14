const Expert = {
  isAnalyzing: false,
  currentRecord: null,
  direction: { source: 'ja', target: 'zh' },

  async init() {
    this.stopSpeech();
    this.render();
    this.renderHistory();
    const latest = Storage.getExpertQueries(Storage._getCurrentUserId())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
    if (latest) this.renderResult(latest, { preferCurrentDirection: true });
  },

  render() {
    const ai = AIProvider.getConfig();
    const user = this.getUserConfig();
    this.direction = { source: 'ja', target: this.getPreferredTarget(user.language) };
    document.getElementById('main-content').innerHTML = `
      <header class="expert-page-header">
        <div>
          <h1>${t('page.expert')}</h1>
          <p>${user.level.toUpperCase()} · ${this.industryLabel(user.industry)} · ${this.escapeHtml(ai.label)}</p>
        </div>
        <button class="expert-provider" id="btn-expert-settings" title="打开 AI 设置">
          <span class="expert-provider-dot ${AIProvider.isConfigured() ? 'is-ready' : ''}"></span>
          ${this.escapeHtml(ai.model || '未配置模型')}
          <i data-lucide="settings-2"></i>
        </button>
      </header>

      <div class="expert-layout">
        <main class="expert-workspace">
          <section class="translator-shell">
            <div class="translator-language-bar">
              <span id="expert-source-language">${this.languageLabel(this.direction.source)}</span>
              <button class="btn-icon translator-swap" id="btn-swap-language" title="交换翻译方向">
                <i data-lucide="arrow-left-right"></i>
              </button>
              <span id="expert-target-language">${this.languageLabel(this.direction.target)}</span>
            </div>

            <div class="translator-grid">
              <div class="translator-pane translator-input-pane">
                <textarea id="expert-input" maxlength="1000" placeholder="${this.inputPlaceholder(this.direction.source)}"></textarea>
                <div class="translator-pane-footer">
                  <div class="translator-tools">
                    <button class="btn-icon" id="btn-input-speak" title="朗读输入内容"><i data-lucide="volume-2"></i></button>
                    <button class="btn-icon" id="btn-input-clear" title="清空"><i data-lucide="x"></i></button>
                  </div>
                  <span id="expert-char-count">0 / 1000</span>
                </div>
              </div>

              <div class="translator-pane translator-output-pane" id="expert-output">
                <div class="translator-placeholder">
                  <i data-lucide="languages"></i>
                  <p>${t('expert.placeholder')}</p>
                </div>
              </div>
            </div>

            <div class="translator-actionbar">
              <span>Ctrl + Enter 快速解析</span>
              <button class="btn btn-primary" id="btn-query">
                <i data-lucide="sparkles"></i>
                翻译并解析
              </button>
            </div>
          </section>

          <div id="expert-status"></div>
          <div id="expert-learning"></div>
        </main>

        <aside class="expert-history-panel">
          <div class="expert-history-header">
            <h2>${t('expert.recent')}</h2>
            <button class="btn-icon" id="btn-clear-history" title="清空历史"><i data-lucide="trash-2"></i></button>
          </div>
          <div id="expert-history"></div>
        </aside>
      </div>
    `;
    this.bindEvents();
    if (window.lucide) lucide.createIcons();
  },

  bindEvents() {
    const input = document.getElementById('expert-input');
    document.getElementById('btn-query').addEventListener('click', () => this.handleQuery());
    document.getElementById('btn-input-clear').addEventListener('click', () => {
      input.value = '';
      input.focus();
      this.updateCharCount();
    });
    document.getElementById('btn-input-speak').addEventListener('click', () => {
      this.speak(input.value, this.speechLanguage(this.direction.source));
    });
    document.getElementById('btn-swap-language').addEventListener('click', () => this.swapDirection());
    document.getElementById('btn-expert-settings').addEventListener('click', () => {
      window.location.hash = 'settings';
    });
    document.getElementById('btn-clear-history').addEventListener('click', () => {
      if (confirm('清空当前用户的 Expert 查询记录？')) {
        Storage.clearExpertQueries(Storage._getCurrentUserId());
        this.currentRecord = null;
        document.getElementById('expert-learning').innerHTML = '';
        this.renderEmptyOutput();
        this.renderHistory();
      }
    });
    input.addEventListener('input', () => this.updateCharCount());
    input.addEventListener('keydown', event => {
      if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) this.handleQuery();
    });
  },

  getUserConfig() {
    const data = Storage.getUserProfile(Storage._getCurrentUserId());
    return {
      language: data.profile.language || 'zh',
      industry: data.profile.industry || 'none',
      level: data.profile.level || 'n3',
      maxExamples: data.settings.maxExamples || 3,
      autoAddToVocab: data.settings.autoAddToVocab || false
    };
  },

  async handleQuery() {
    if (this.isAnalyzing) return;
    const input = document.getElementById('expert-input');
    const query = input.value.trim();
    if (!query) {
      input.focus();
      return;
    }
    if (!AIProvider.isConfigured()) {
      this.showStatus('请先在设置中配置并启用一个 AI 服务。', 'error');
      return;
    }

    this.isAnalyzing = true;
    this.setBusy(true);
    this.showStatus('正在结合你的等级与行业背景进行解析...', 'loading');
    try {
      const config = { ...this.getUserConfig(), mode: 'natural' };
      config.sourceLanguage = this.direction.source;
      config.targetLanguage = this.direction.target;
      const ai = AIProvider.getConfig();
      const result = await AIProvider.analyzeWord(query, config);
      const record = Storage.addExpertQuery({
        query,
        userId: Storage._getCurrentUserId(),
        profileSnapshot: {
          language: config.language,
          industry: config.industry,
          level: config.level,
          sourceLanguage: config.sourceLanguage,
          targetLanguage: config.targetLanguage
        },
        aiSnapshot: { provider: ai.provider, model: ai.model },
        result,
        linkedWordId: null,
        addedToVocab: false,
        createdAt: new Date().toISOString()
      });
      if (config.autoAddToVocab && !this.isSentenceRecord(record)) this.addToVocab(record);
      this.showStatus('');
      this.renderResult(Storage.getExpertQuery(record.id) || record);
      this.renderHistory();
    } catch (error) {
      this.showStatus(`解析失败：${error.message}`, 'error');
    } finally {
      this.isAnalyzing = false;
      this.setBusy(false);
    }
  },

  renderResult(record, options = {}) {
    this.currentRecord = record;
    this.applyRecordDirection(record, options.preferCurrentDirection);
    const result = record.result || {};
    const translation = this.getTranslation(result, this.direction.target);
    const reading = result.reading || '';
    const alternatives = Array.isArray(result.alternatives) ? result.alternatives : [];

    document.getElementById('expert-input').value = record.query || '';
    this.updateCharCount();
    document.getElementById('expert-output').innerHTML = `
      <div class="translator-result">
        ${reading ? `<p class="translator-reading">${this.escapeHtml(reading)}</p>` : ''}
        <p class="translator-translation">${this.escapeHtml(translation || '暂无翻译')}</p>
        ${alternatives.length ? `
          <div class="translator-alternatives">
            ${alternatives.slice(0, 3).map(item => `<span>${this.escapeHtml(item)}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <div class="translator-pane-footer">
        <div class="translator-tools">
          <button class="btn-icon" id="btn-output-speak" title="朗读${this.languageLabel(this.direction.target)}"><i data-lucide="volume-2"></i></button>
          <button class="btn-icon" id="btn-output-copy" title="复制译文"><i data-lucide="copy"></i></button>
        </div>
        <span>自然翻译</span>
      </div>
    `;

    const examples = Array.isArray(result.examples) ? result.examples : [];
    const parts = Array.isArray(result.breakdown) ? result.breakdown : [];
    const pos = Array.isArray(result.pos) ? result.pos : [];
    const isSentence = this.isSentenceRecord(record);
    const phraseExists = isSentence && this.findExistingPhrase(record);
    document.getElementById('expert-learning').innerHTML = `
      <section class="expert-learning-shell">
        <div class="expert-learning-title">
          <div>
            <span>LEARNING NOTES</span>
            <h2>${this.escapeHtml(result.word || record.query)}</h2>
          </div>
          <div class="expert-result-actions">
            ${pos.map(item => `<span class="expert-pos">${this.escapeHtml(item)}</span>`).join('')}
            ${isSentence ? `
              <button class="btn btn-secondary btn-sm" id="btn-add-phrase" ${phraseExists ? 'disabled' : ''}>
                <i data-lucide="message-square-plus"></i>
                ${phraseExists ? '已加入表达库' : '整句加入表达库'}
              </button>
            ` : `
              <button class="btn btn-secondary btn-sm" id="btn-add-vocab" ${record.addedToVocab ? 'disabled' : ''}>
                <i data-lucide="bookmark-plus"></i>
                ${record.addedToVocab ? '已加入词汇本' : '加入词汇本'}
              </button>
            `}
            <button class="btn-icon" id="btn-delete-query" title="删除记录"><i data-lucide="trash-2"></i></button>
          </div>
        </div>

        <div class="expert-insight-grid">
          <div class="expert-insight">
            <span>${this.direction.target === 'ja' ? '日语表达说明' : '日语释义'}</span>
            <p>${this.escapeHtml(result.meaningJp || '暂无')}</p>
          </div>
          <div class="expert-insight">
            <span>语感与使用场景</span>
            <p>${this.escapeHtml(result.nuance || result.levelNote || '暂无')}</p>
          </div>
        </div>

        ${parts.length ? `
          <section class="expert-learning-section">
            <h3><i data-lucide="blocks"></i>句子拆解</h3>
            <div class="expert-breakdown">
              ${parts.map(item => `
                <div class="expert-breakdown-item">
                  <div>
                    <strong>${this.escapeHtml(item.text || '')}</strong>
                    <span>${this.escapeHtml(item.reading || '')}</span>
                    <p>${this.escapeHtml(item.meaning || '')}</p>
                  </div>
                  <button
                    class="btn-icon expert-breakdown-add"
                    data-word="${this.escapeAttr(item.text || '')}"
                    data-reading="${this.escapeAttr(item.reading || '')}"
                    data-meaning="${this.escapeAttr(item.meaning || '')}"
                    title="加入词汇本"
                    ${this.findExistingWord(item.text) ? 'disabled' : ''}
                  >
                    <i data-lucide="${this.findExistingWord(item.text) ? 'bookmark-check' : 'bookmark-plus'}"></i>
                  </button>
                </div>
              `).join('')}
            </div>
          </section>
        ` : ''}

        ${result.grammarNotes ? `
          <section class="expert-learning-section">
            <h3><i data-lucide="book-open-check"></i>语法与表达</h3>
            <p class="expert-learning-copy">${this.escapeHtml(result.grammarNotes)}</p>
          </section>
        ` : ''}

        ${examples.length ? `
          <section class="expert-learning-section">
            <h3><i data-lucide="message-square-text"></i>适合你的例句</h3>
            <div class="expert-examples">
              ${examples.map((example, index) => `
                <article>
                  <span>${String(index + 1).padStart(2, '0')}</span>
                  <div>
                    <p class="expert-example-jp">${this.escapeHtml(example.jp || '')}</p>
                    ${example.reading ? `<p class="expert-example-reading">${this.escapeHtml(example.reading)}</p>` : ''}
                    <p class="expert-example-zh">${this.escapeHtml(example.zh || example.en || '')}</p>
                  </div>
                  <button class="btn-icon expert-example-speak" data-speak="${this.escapeAttr(example.jp || '')}" title="朗读例句">
                    <i data-lucide="volume-2"></i>
                  </button>
                </article>
              `).join('')}
            </div>
          </section>
        ` : ''}
      </section>
    `;

    document.getElementById('btn-output-speak').addEventListener('click', () => {
      this.speak(translation, this.speechLanguage(this.direction.target));
    });
    document.getElementById('btn-output-copy').addEventListener('click', () => this.copyText(translation));
    document.getElementById('btn-add-vocab')?.addEventListener('click', () => {
      this.addToVocab(record);
      this.renderResult(Storage.getExpertQuery(record.id) || record);
      this.renderHistory();
    });
    document.getElementById('btn-add-phrase')?.addEventListener('click', () => {
      this.addToPhrases(record);
      this.renderResult(Storage.getExpertQuery(record.id) || record);
      this.renderHistory();
    });
    document.querySelectorAll('.expert-breakdown-add').forEach(button => {
      button.addEventListener('click', () => {
        this.addBreakdownToVocab(record, {
          text: button.dataset.word,
          reading: button.dataset.reading,
          meaning: button.dataset.meaning
        });
        this.renderResult(Storage.getExpertQuery(record.id) || record);
      });
    });
    document.getElementById('btn-delete-query').addEventListener('click', () => {
      if (confirm('删除这条查询记录？')) {
        Storage.removeExpertQuery(record.id);
        this.currentRecord = null;
        this.renderEmptyOutput();
        document.getElementById('expert-learning').innerHTML = '';
        this.renderHistory();
      }
    });
    document.querySelectorAll('.expert-example-speak').forEach(button => {
      button.addEventListener('click', () => this.speak(button.dataset.speak, 'ja-JP'));
    });
    if (window.lucide) lucide.createIcons();
  },

  renderEmptyOutput() {
    document.getElementById('expert-output').innerHTML = `
      <div class="translator-placeholder">
        <i data-lucide="languages"></i>
        <p>翻译和学习解析会显示在这里</p>
      </div>
    `;
    if (window.lucide) lucide.createIcons();
  },

  renderHistory() {
    const history = Storage.getExpertQueries(Storage._getCurrentUserId())
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const container = document.getElementById('expert-history');
    if (!container) return;
    if (!history.length) {
      container.innerHTML = `<p class="expert-history-empty">${t('expert.empty')}</p>`;
      return;
    }
    container.innerHTML = history.slice(0, 30).map(item => `
      <button class="expert-history-item ${this.currentRecord?.id === item.id ? 'is-active' : ''}" data-id="${item.id}">
        <span class="expert-history-query">${this.escapeHtml(item.query)}</span>
        <span class="expert-history-meaning">${this.escapeHtml(this.getTranslation(
          item.result || {},
          item.profileSnapshot?.targetLanguage || this.getPreferredTarget(this.getUserConfig().language)
        ))}</span>
        <time>${this.formatTime(item.createdAt)}</time>
        ${item.addedToVocab ? '<i data-lucide="bookmark-check"></i>' : ''}
      </button>
    `).join('');
    container.querySelectorAll('[data-id]').forEach(button => {
      button.addEventListener('click', () => {
        const record = Storage.getExpertQuery(button.dataset.id);
        if (record) {
          this.renderResult(record);
          this.renderHistory();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
    if (window.lucide) lucide.createIcons();
  },

  addToVocab(record) {
    const result = record.result || {};
    const existing = Storage.getAll('vocabulary').find(item => item.expertQueryId === record.id);
    if (existing) return existing;
    const item = Storage.add('vocabulary', {
      word: result.word || record.query,
      reading: result.reading || '',
      meaningJp: result.meaningJp || '',
      meaningZh: result.translationZh || result.meaningZh || result.translationEn || result.meaningEn || result.translation || '',
      source: 'expert',
      expertQueryId: record.id,
      ...SM2.initItem(),
      created: new Date().toISOString()
    });
    Storage.linkToVocab(record.id, item.id);
    return item;
  },

  addBreakdownToVocab(record, part) {
    const word = String(part.text || '').trim();
    if (!word || this.findExistingWord(word)) return null;
    return Storage.add('vocabulary', {
      word,
      reading: part.reading || '',
      meaningJp: '',
      meaningZh: part.meaning || '',
      source: 'expert-breakdown',
      expertQueryId: record.id,
      ...SM2.initItem(),
      created: new Date().toISOString()
    });
  },

  addToPhrases(record) {
    if (this.findExistingPhrase(record)) return null;
    const result = record.result || {};
    const japanese = this.getJapaneseText(record);
    const translation = this.direction.source === 'ja'
      ? this.getTranslation(result, this.direction.target)
      : record.query;
    const phrase = Storage.add('phrases', {
      japanese,
      reading: result.reading || '',
      chinese: translation || '',
      category: 'other',
      source: 'expert',
      expertQueryId: record.id,
      created: new Date().toISOString()
    });
    Storage.updateExpertQuery(record.id, { addedToPhrases: true, linkedPhraseId: phrase.id });
    return phrase;
  },

  getJapaneseText(record) {
    if (this.direction.source === 'ja') return record.query || '';
    const result = record.result || {};
    return result.translationJa || result.translation || result.word || '';
  },

  isSentenceRecord(record) {
    const inputType = record.result?.inputType;
    if (inputType === 'sentence' || inputType === 'expression') return true;
    if (inputType === 'word') return false;
    const text = String(record.query || '').trim();
    if (!text) return false;
    return /[。！？.!?]/.test(text) || /\s/.test(text) || text.length > 18;
  },

  findExistingWord(word) {
    const normalized = String(word || '').trim();
    if (!normalized) return null;
    return Storage.getAll('vocabulary').find(item => String(item.word || '').trim() === normalized) || null;
  },

  findExistingPhrase(record) {
    const japanese = this.getJapaneseText(record).trim();
    if (!japanese) return null;
    return Storage.getAll('phrases').find(item =>
      item.expertQueryId === record.id || String(item.japanese || '').trim() === japanese
    ) || null;
  },

  updateCharCount() {
    const input = document.getElementById('expert-input');
    const count = document.getElementById('expert-char-count');
    if (input && count) count.textContent = `${input.value.length} / 1000`;
  },

  setBusy(busy) {
    const button = document.getElementById('btn-query');
    button.disabled = busy;
    button.innerHTML = busy
      ? '<span class="expert-spinner"></span>解析中'
      : '<i data-lucide="sparkles"></i>翻译并解析';
    if (window.lucide) lucide.createIcons();
  },

  showStatus(message, type = '') {
    const status = document.getElementById('expert-status');
    status.innerHTML = message
      ? `<div class="expert-status expert-status--${type}">${this.escapeHtml(message)}</div>`
      : '';
  },

  speak(text, lang) {
    if (!text) return;
    if (!('speechSynthesis' in window)) {
      this.showStatus('当前浏览器不支持语音朗读。', 'error');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  },

  stopSpeech() {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  },

  async copyText(text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.showStatus('译文已复制。');
      setTimeout(() => this.showStatus(''), 1200);
    } catch {
      this.showStatus('复制失败，请手动选择文本。', 'error');
    }
  },

  getPreferredTarget(language) {
    return language === 'en' ? 'en' : 'zh';
  },

  languageLabel(language) {
    return { ja: t('language.japanese'), zh: t('language.chinese'), en: t('language.english') }[language] || language;
  },

  inputPlaceholder(language) {
    return {
      ja: '输入日语单词、句子或一段文字...',
      zh: '输入中文单词、句子或一段文字...',
      en: 'Enter an English word, sentence, or short passage...'
    }[language] || '输入要翻译的内容...';
  },

  speechLanguage(language) {
    return { ja: 'ja-JP', zh: 'zh-CN', en: 'en-US' }[language] || 'ja-JP';
  },

  swapDirection() {
    const previous = this.direction.source;
    this.direction.source = this.direction.target;
    this.direction.target = previous;
    this.updateDirectionUi();
    this.renderEmptyOutput();
    document.getElementById('expert-learning').innerHTML = '';
    this.currentRecord = null;
    this.renderHistory();
    document.getElementById('expert-input').focus();
  },

  updateDirectionUi() {
    const source = document.getElementById('expert-source-language');
    const target = document.getElementById('expert-target-language');
    const input = document.getElementById('expert-input');
    if (source) source.textContent = this.languageLabel(this.direction.source);
    if (target) target.textContent = this.languageLabel(this.direction.target);
    if (input) input.placeholder = this.inputPlaceholder(this.direction.source);
  },

  applyRecordDirection(record, preferCurrentDirection = false) {
    const source = record.profileSnapshot?.sourceLanguage;
    const target = record.profileSnapshot?.targetLanguage;
    if (!preferCurrentDirection && source && target) {
      this.direction = { source, target };
    } else {
      this.direction = {
        source: 'ja',
        target: this.getPreferredTarget(this.getUserConfig().language)
      };
    }
    this.updateDirectionUi();
  },

  getTranslation(result, targetLanguage) {
    if (result.translation) return result.translation;
    if (targetLanguage === 'ja') {
      return result.translationJa || result.word || result.meaningJp || '';
    }
    if (targetLanguage === 'en') {
      return result.translationEn || result.meaningEn || result.translationZh || result.meaningZh || '';
    }
    return result.translationZh || result.meaningZh || result.translationEn || result.meaningEn || '';
  },

  industryLabel(industry) {
    return I18n.translate(NHK?.getIndustryPlan?.(industry)?.label || industry || t('reading.general'));
  },

  formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
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

window.Expert = Expert;
