const Article = {
  candidates: [],
  speech: {
    queueToken: 0,
    paused: false,
    activeIndex: -1
  },

  async init() {
    this.stopSpeech();
    this.renderListPage();
  },

  getCurrentUser() {
    const config = Storage.getConfig();
    return config.users.find(user => user.id === config.currentUserId) || null;
  },

  getReadingProfile() {
    const user = this.getCurrentUser();
    return {
      userId: user?.id || 'user_default',
      level: user?.profile?.level || 'n3',
      language: user?.profile?.language || 'zh',
      industry: user?.profile?.industry || 'none',
      showFurigana: user?.settings?.showFurigana !== false
    };
  },

  getUserArticles() {
    const profile = this.getReadingProfile();
    return Storage.getAll('articles')
      .filter(article => article.kind === 'graded-news' && article.userId === profile.userId)
      .sort((a, b) => new Date(b.generatedAt || b.date) - new Date(a.generatedAt || a.date));
  },

  renderListPage() {
    const profile = this.getReadingProfile();
    const plan = NHK.getIndustryPlan(profile.industry);
    document.getElementById('main-content').innerHTML = `
      <header class="view-header news-header">
        <div>
          <h1>${t('page.reading')}</h1>
          <p class="view-subtitle">${this.escapeHtml(I18n.translate(plan.label))} · ${profile.level.toUpperCase()} · ${t('reading.minutes')}</p>
        </div>
        <button class="btn btn-primary" id="btn-fetch-news">
          <i data-lucide="search"></i>
          查找阅读主题
        </button>
      </header>
      <div id="article-status"></div>
      <div id="candidate-panel"></div>
      <div id="article-list" class="news-list"></div>
    `;
    document.getElementById('btn-fetch-news').addEventListener('click', () => this.fetchNews());
    this.renderList();
    if (window.lucide) lucide.createIcons();
  },

  async fetchNews() {
    const button = document.getElementById('btn-fetch-news');
    const status = document.getElementById('article-status');
    const profile = this.getReadingProfile();
    button.disabled = true;
    button.innerHTML = '<span>查找中...</span>';
    status.innerHTML = '<div class="card news-progress">正在整理适合当前行业的主题...</div>';

    try {
      this.candidates = await NHK.fetchCandidates(profile);
      if (!this.candidates.length) throw new Error('目前没有找到可用的阅读主题。');
      status.innerHTML = '';
      this.renderCandidatePanel(profile);
    } catch (error) {
      status.innerHTML = `<div class="card news-error">${this.escapeHtml(error.message)}</div>`;
    } finally {
      button.disabled = false;
      button.innerHTML = '<i data-lucide="refresh-cw"></i><span>重新查找</span>';
      if (window.lucide) lucide.createIcons();
    }
  },

  renderCandidatePanel(profile) {
    const panel = document.getElementById('candidate-panel');
    const plan = NHK.getIndustryPlan(profile.industry);
    panel.innerHTML = `
      <section class="candidate-planner">
        <div class="candidate-plan-header">
          <div>
            <span class="candidate-eyebrow">本次查找范围</span>
            <h2>${this.escapeHtml(plan.label)}相关内容</h2>
            <p>${plan.topics.map(topic => this.escapeHtml(topic)).join('、')}</p>
          </div>
          <span class="badge badge-primary">${profile.level.toUpperCase()}</span>
        </div>
        <div class="candidate-sources">
          ${plan.sources.map(source => `
            <a href="${this.escapeAttr(source.url)}" target="_blank" rel="noopener noreferrer">
              <strong>${this.escapeHtml(source.name)}</strong>
              <span>${this.escapeHtml(source.section)}</span>
            </a>
          `).join('')}
        </div>
        <div class="candidate-list-header">
          <div>
            <h3>选择要生成的主题</h3>
            <p>默认选择 3 篇，生成时才会使用 AI 配额。</p>
          </div>
          <span id="candidate-count">已选 0 / 3</span>
        </div>
        <div class="candidate-list">
          ${this.candidates.slice(0, 8).map((candidate, index) => `
            <label class="candidate-item">
              <input type="checkbox" value="${index}" ${index < 3 ? 'checked' : ''}>
              <span class="candidate-check"><i data-lucide="check"></i></span>
              <span class="candidate-copy">
                <strong>${this.escapeHtml(candidate.title)}</strong>
                <small>${this.escapeHtml(candidate.sourceName || '公开资料')} · ${this.escapeHtml(candidate.category || '综合')}</small>
              </span>
            </label>
          `).join('')}
        </div>
        <div class="candidate-actions">
          <button class="btn btn-secondary" id="btn-cancel-candidates">取消</button>
          <button class="btn btn-primary" id="btn-generate-selected">
            <i data-lucide="sparkles"></i>
            生成所选文章
          </button>
        </div>
      </section>
    `;

    const checkboxes = [...panel.querySelectorAll('.candidate-item input')];
    const updateSelection = changed => {
      const checked = checkboxes.filter(input => input.checked);
      if (checked.length > 3 && changed) changed.checked = false;
      const count = checkboxes.filter(input => input.checked).length;
      panel.querySelector('#candidate-count').textContent = `已选 ${count} / 3`;
      panel.querySelector('#btn-generate-selected').disabled = count === 0;
    };
    checkboxes.forEach(input => input.addEventListener('change', () => updateSelection(input)));
    panel.querySelector('#btn-cancel-candidates').addEventListener('click', () => {
      panel.innerHTML = '';
    });
    panel.querySelector('#btn-generate-selected').addEventListener('click', () => {
      const selected = checkboxes
        .filter(input => input.checked)
        .map(input => this.candidates[Number(input.value)]);
      this.generateSelected(selected, profile);
    });
    updateSelection();
    if (window.lucide) lucide.createIcons();
  },

  async generateSelected(selected, profile) {
    const panel = document.getElementById('candidate-panel');
    const status = document.getElementById('article-status');
    const button = panel.querySelector('#btn-generate-selected');
    button.disabled = true;
    try {
      const generated = await NHK.generateSelected(selected, profile, (current, total, source) => {
        status.innerHTML = `
          <div class="card news-progress">
            <strong>正在生成 ${current} / ${total}</strong>
            <p>${this.escapeHtml(source.title)}</p>
          </div>
        `;
      });
      this.saveGenerated(generated, profile.userId);
      panel.innerHTML = '';
      status.innerHTML = `<p class="news-success">已生成 ${generated.length} 篇分级文章。</p>`;
      this.renderList();
    } catch (error) {
      status.innerHTML = `<div class="card news-error">${this.escapeHtml(error.message)}</div>`;
      button.disabled = false;
    }
  },

  saveGenerated(generated, userId) {
    const articles = Storage.getAll('articles');
    generated.forEach(article => {
      const data = { ...article, userId };
      const index = articles.findIndex(item =>
        item.kind === 'graded-news' &&
        item.userId === userId &&
        item.sourceId === data.sourceId &&
        item.level === data.level
      );
      if (index >= 0) {
        articles[index] = { ...articles[index], ...data };
      } else {
        data.id = 'article_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
        articles.push(data);
      }
    });
    Storage.saveAll('articles', articles);
  },

  renderList() {
    const articles = this.getUserArticles();
    const container = document.getElementById('article-list');
    if (!container) return;
    if (!articles.length) {
      container.innerHTML = `
        <div class="news-empty">
          <i data-lucide="newspaper"></i>
          <h2>${t('reading.empty')}</h2>
          <p>${t('reading.emptyHelp')}</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons();
      return;
    }

    container.innerHTML = articles.map(article => `
      <article class="news-list-item" data-id="${article.id}" tabindex="0">
        <div class="news-list-main">
          <div class="news-list-meta">
            <span class="badge badge-primary">${this.escapeHtml((article.level || 'n3').toUpperCase())}</span>
            <span><i data-lucide="clock-3"></i>${Number(article.estimatedMinutes || 15)} min</span>
            <span>${this.escapeHtml(article.topic || 'news')}</span>
          </div>
          <h2>${this.escapeHtml(article.title)}</h2>
          <p>${this.escapeHtml(article.summary || '')}</p>
          <div class="news-source-line">Based on: ${this.escapeHtml(article.sourceTitle || '')}</div>
        </div>
        <i class="news-list-arrow" data-lucide="chevron-right"></i>
      </article>
    `).join('');

    container.querySelectorAll('[data-id]').forEach(item => {
      const open = () => this.showDetail(item.dataset.id);
      item.addEventListener('click', open);
      item.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') open();
      });
    });
    if (window.lucide) lucide.createIcons();
  },

  showDetail(id) {
    const article = Storage.getById('articles', id);
    if (!article) return;
    const profile = this.getReadingProfile();
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="reader-toolbar">
        <button class="btn-icon reader-back" id="btn-reader-back" title="Back to list">
          <i data-lucide="arrow-left"></i>
        </button>
        <div class="reader-toolbar-spacer"></div>
        <div class="reader-speech-controls" aria-label="朗读控制">
          <button class="btn-icon" id="btn-reader-play" title="朗读全文">
            <i data-lucide="play"></i>
          </button>
          <button class="btn-icon" id="btn-reader-pause" title="暂停或继续">
            <i data-lucide="pause"></i>
          </button>
          <button class="btn-icon" id="btn-reader-stop" title="停止朗读">
            <i data-lucide="square"></i>
          </button>
          <label class="reader-speed">
            <span>语速</span>
            <select id="reader-speed">
              <option value="0.7">0.7x</option>
              <option value="0.85" selected>0.85x</option>
              <option value="1">1.0x</option>
              <option value="1.15">1.15x</option>
            </select>
          </label>
        </div>
        <label class="furigana-toggle">
          <input type="checkbox" id="toggle-furigana" ${profile.showFurigana ? 'checked' : ''}>
          <span>Furigana</span>
        </label>
      </div>
      <article class="reader-shell ${profile.showFurigana ? '' : 'hide-furigana'}" id="reader-shell">
        <header class="reader-header">
          <div class="news-list-meta">
            <span class="badge badge-primary">${this.escapeHtml((article.level || 'n3').toUpperCase())}</span>
            <span><i data-lucide="clock-3"></i>${Number(article.estimatedMinutes || 15)} min</span>
            <span>AI-adapted</span>
          </div>
          <h1>${this.escapeHtml(article.title)}</h1>
          <p>${this.escapeHtml(article.summary || '')}</p>
        </header>
        <p class="reader-speech-hint"><i data-lucide="volume-2"></i>点击任意段落，可从该段开始朗读。</p>
        <div class="reader-body">
          ${(article.paragraphs || []).map((paragraph, index) => `
            <p data-paragraph-index="${index}" tabindex="0">${this.renderSegments(paragraph.segments || [])}</p>
          `).join('')}
        </div>
        ${(article.vocab || []).length ? `
          <section class="reader-vocabulary">
            <h2>Key vocabulary</h2>
            <div class="reader-vocab-grid">
              ${(article.vocab || []).map(item => `
                <div class="reader-vocab-item">
                  <strong>${this.escapeHtml(item.word || '')}</strong>
                  <span>${this.escapeHtml(item.reading || '')}</span>
                  <p>${this.escapeHtml(item.meaningZh || item.meaning || '')}</p>
                </div>
              `).join('')}
            </div>
          </section>
        ` : ''}
        <footer class="reader-source">
          <strong>Source topic</strong>
          <p>${this.escapeHtml(article.sourceTitle || '')}</p>
          ${this.safeUrl(article.sourceUrl) ? `<a href="${this.escapeAttr(article.sourceUrl)}" target="_blank" rel="noopener noreferrer">Open original source</a>` : ''}
        </footer>
      </article>
    `;

    const paragraphs = article.paragraphs || [];
    document.getElementById('btn-reader-back').addEventListener('click', () => {
      this.stopSpeech();
      this.renderListPage();
    });
    document.getElementById('btn-reader-play').addEventListener('click', () => this.speakParagraphs(paragraphs, 0));
    document.getElementById('btn-reader-pause').addEventListener('click', () => this.toggleSpeechPause());
    document.getElementById('btn-reader-stop').addEventListener('click', () => this.stopSpeech());
    main.querySelectorAll('[data-paragraph-index]').forEach(element => {
      const play = () => this.speakParagraphs(paragraphs, Number(element.dataset.paragraphIndex));
      element.addEventListener('click', play);
      element.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') play();
      });
    });
    document.getElementById('toggle-furigana').addEventListener('change', event => {
      main.querySelector('#reader-shell').classList.toggle('hide-furigana', !event.target.checked);
      Storage.updateUserProfile(profile.userId, {
        settings: { showFurigana: event.target.checked }
      });
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) lucide.createIcons();
  },

  paragraphText(paragraph) {
    return (paragraph?.segments || []).map(segment => segment.text || '').join('');
  },

  speakParagraphs(paragraphs, startIndex = 0) {
    if (!('speechSynthesis' in window)) {
      alert('当前浏览器不支持语音朗读。');
      return;
    }
    this.stopSpeech();
    const token = this.speech.queueToken;
    const rate = Number(document.getElementById('reader-speed')?.value || 0.85);
    const speakNext = index => {
      if (token !== this.speech.queueToken || index >= paragraphs.length) {
        this.highlightParagraph(-1);
        return;
      }
      const text = this.paragraphText(paragraphs[index]).trim();
      if (!text) {
        speakNext(index + 1);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = rate;
      utterance.onstart = () => this.highlightParagraph(index);
      utterance.onend = () => speakNext(index + 1);
      utterance.onerror = () => this.highlightParagraph(-1);
      window.speechSynthesis.speak(utterance);
    };
    speakNext(startIndex);
  },

  toggleSpeechPause() {
    if (!('speechSynthesis' in window)) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      this.speech.paused = false;
    } else if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      this.speech.paused = true;
    }
  },

  stopSpeech() {
    this.speech.queueToken += 1;
    this.speech.paused = false;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    this.highlightParagraph(-1);
  },

  highlightParagraph(index) {
    document.querySelectorAll('[data-paragraph-index]').forEach(element => {
      element.classList.toggle('is-speaking', Number(element.dataset.paragraphIndex) === index);
    });
    this.speech.activeIndex = index;
  },

  renderSegments(segments) {
    return segments.map(segment => {
      const text = this.escapeHtml(segment.text || '');
      const reading = this.escapeHtml(segment.reading || '');
      return reading ? `<ruby>${text}<rt>${reading}</rt></ruby>` : text;
    }).join('');
  },

  safeUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === 'https:' || url.protocol === 'http:';
    } catch {
      return false;
    }
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

window.Article = Article;
