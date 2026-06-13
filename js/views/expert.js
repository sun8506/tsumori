/**
 * Expert View — 专业日语专家
 * 
 * AI 驱动日语查询、解析、记录、入库。
 */

const Expert = {
  currentQuery: null,
  isAnalyzing: false,

  async init() {
    this.render();
    this.bindEvents();
    await this.renderHistory();
    this.loadLatest();
  },

  render() {
    const main = document.getElementById('main-content');
    const profile = Storage.getUserProfile(Storage._getCurrentUserId());
    const langLabel = {
      zh: '中文', en: 'English', 'zh-en': '中文+英文', 'ja-zh': '日文+中文'
    }[profile.profile?.language || 'zh'] || '中文';
    const indLabel = {
      it: 'IT', sales: '营业', realestate: '房产', hospitality: '酒店',
      food: '餐饮', service: '服务', education: '教育', manufacturing: '制造', none: '通用'
    }[profile.profile?.industry || 'none'] || '通用';

    main.innerHTML = `
      <header class="view-header">
        <h1>🧠 专业日语专家</h1>
        <p class="view-subtitle">输入词・短语・句子查询解析 — ${langLabel}释义 / ${indLabel}场景</p>
      </header>
      <div class="view-actions">
        <input class="form-input" id="expert-input" type="text" placeholder="例：お疲れ様です、見積もり..." autocomplete="off">
        <button class="btn btn-primary" id="btn-query">🔍 查询</button>
      </div>
      <div id="expert-status" class="expert-status" style="display:none"></div>
      <div id="expert-result"></div>
      <section class="dash-section expert-section" style="margin-top:24px">
        <h2>查询历史</h2>
        <div id="expert-history"></div>
      </section>
    `;
  },

  _getCurrentUserId() {
    const config = JSON.parse(Storage.get('_config') || '{}') || {};
    return config.currentUserId;
  },

  getUserConfig() {
    const p = Storage.getUserProfile(this._getCurrentUserId());
    return {
      language: p.profile?.language || 'zh',
      industry: p.profile?.industry || 'none',
      level: p.profile?.level || 'n3',
      maxExamples: p.settings?.maxExamples || 3,
      autoAddToVocab: p.settings?.autoAddToVocab || false
    };
  },

  bindEvents() {
    document.getElementById('btn-query').addEventListener('click', () => this.handleQuery());
    document.getElementById('expert-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleQuery();
    });
  },

  async handleQuery() {
    const input = document.getElementById('expert-input');
    const query = input.value.trim();
    if (!query) return;
    if (this.isAnalyzing) return;

    this.isAnalyzing = true;
    const status = document.getElementById('expert-status');
    status.style.display = 'block';
    status.className = 'expert-status expert-status--loading';
    status.innerHTML = '<p>🔍 正在解析中...</p>';

    try {
      const config = this.getUserConfig();
      const result = await Gemini.analyzeWord(query, config);

      if (!result) {
        status.style.display = 'block';
        status.className = 'expert-status expert-status--error';
        status.innerHTML = '<p>❌ 解析失败，请检查 API Key 或重试</p>';
        return;
      }

      // Save query record
      const userId = this._getCurrentUserId();
      const queryRecord = {
        id: 'eq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        query: query,
        userId: userId,
        profileSnapshot: {
          industry: config.industry,
          level: config.level,
          language: config.language
        },
        result: result,
        linkedWordId: null,
        addedToVocab: false,
        createdAt: new Date().toISOString(),
        reviewedCount: 0
      };

      Storage.addExpertQuery(queryRecord);
      this.currentQuery = queryRecord;

      // Show result
      status.style.display = 'none';
      this.renderResult(queryRecord);

      // Auto add to vocab
      if (config.autoAddToVocab) {
        await this.addToVocab(queryRecord, result);
      }

      // Refresh history
      await this.renderHistory();
    } catch (e) {
      console.error('Query error:', e);
      status.style.display = 'block';
      status.className = 'expert-status expert-status--error';
      status.innerHTML = '<p>❌ 解析出错: ' + this.escapeHtml(e.message) + '</p>';
    } finally {
      this.isAnalyzing = false;
      input.value = '';
    }
  },

  renderResult(record) {
    const r = record.result;
    const posHtml = (r.pos && r.pos.length > 0) ? r.pos.join('・') : '—';
    const lang = record.profileSnapshot.language;

    const examplesHtml = (r.examples || []).map((ex) => `
      <div class="expert-example">
        <p class="expert-example-jp">${this.escapeHtml(ex.jp)}</p>
        <p class="expert-example-reading">${this.escapeHtml(ex.reading)}</p>
        ${ex.zh ? `<p class="expert-example-zh">${this.escapeHtml(ex.zh)}</p>` : ''}
        ${ex.en ? `<p class="expert-example-en">${this.escapeHtml(ex.en)}</p>` : ''}
      </div>
    `).join('');

    const meaningZhHtml = (r.meaningZh && lang !== 'en')
      ? `<p class="expert-meaning"><span class="expert-label expert-label--zh">🇨🇳 中文</span> ${this.escapeHtml(r.meaningZh)}</p>` : '';
    const meaningEnHtml = (r.meaningEn && (lang === 'en' || lang === 'zh-en'))
      ? `<p class="expert-meaning"><span class="expert-label expert-label--en">🇺🇸 English</span> ${this.escapeHtml(r.meaningEn)}</p>` : '';

    const vocabStatus = record.addedToVocab
      ? '<span class="expert-vocab-badge">✅ 已加入单词库</span>'
      : `<button class="btn btn-primary btn-sm" id="btn-add-vocab">📚 加入单词库</button>`;

    const deleteBtnHtml = record.addedToVocab
      ? '<button class="btn btn-sm" disabled style="opacity:0.35" id="btn-delete-query">🗑 已入库，不可删除</button>'
      : '<button class="btn btn-sm btn-danger" id="btn-delete-query">🗑 删除此条查询</button>';

    const html = `
      <div class="card expert-card" id="expert-result-card">
        <div class="card-header">
          <strong>📋 "${this.escapeHtml(record.query)}"</strong>
          ${record.addedToVocab ? '<span class="badge badge-primary">已入库</span>' : ''}
        </div>
        <div class="expert-meta">
          <p><span class="expert-label">📖 读音</span> ${this.escapeHtml(r.reading || '—')}</p>
          <p><span class="expert-label">🏷️ 品词</span> ${this.escapeHtml(posHtml)}</p>
        </div>
        <div class="expert-meanings">
          <p class="expert-meaning"><span class="expert-label">🇯🇵 日文</span> ${this.escapeHtml(r.meaningJp)}</p>
          ${meaningZhHtml}
          ${meaningEnHtml}
        </div>
        ${examplesHtml ? `
        <div class="expert-section-block">
          <h4 class="expert-section-title">📝 行业相关例句</h4>
          ${examplesHtml}
        </div>` : ''}
        ${r.grammarNotes ? `
        <div class="expert-section-block">
          <h4 class="expert-section-title">🔤 语法说明</h4>
          <p class="expert-text">${this.escapeHtml(r.grammarNotes)}</p>
        </div>` : ''}
        ${r.nuance ? `
        <div class="expert-section-block">
          <h4 class="expert-section-title">💡 语感提示</h4>
          <p class="expert-text">${this.escapeHtml(r.nuance)}</p>
        </div>` : ''}
        <div class="expert-actions">
          ${vocabStatus}
          <button class="btn btn-secondary btn-sm" id="btn-close-result">关闭</button>
        </div>
        <div class="expert-actions expert-actions--secondary">
          ${deleteBtnHtml}
        </div>
      </div>
    `;

    document.getElementById('expert-result').innerHTML = html;

    // Bind add-to-vocab
    const addBtn = document.getElementById('btn-add-vocab');
    if (addBtn) {
      addBtn.addEventListener('click', async () => {
        await this.addToVocab(record, r);
        const vocabList = Storage.getAll('vocabulary');
        const linked = vocabList.find(v => v.expertQueryId === record.id);
        this.currentQuery = { ...record, addedToVocab: true, linkedWordId: linked ? linked.id : null };
        this.renderResult(this.currentQuery);
      });
    }

    // Bind close
    const closeBtn = document.getElementById('btn-close-result');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        document.getElementById('expert-result').innerHTML = '';
      });
    }

    // Bind delete
    const deleteBtn = document.getElementById('btn-delete-query');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        if (confirm('确定删除这条查询记录？（已入库的单词不受影响）')) {
          Storage.removeExpertQuery(record.id);
          this.currentQuery = null;
          document.getElementById('expert-result').innerHTML = '';
          this.renderHistory();
        }
      });
    }
  },

  async addToVocab(record, result) {
    const existing = Storage.getAll('vocabulary').find(
      v => v.word === result.word && v.expertQueryId === record.id
    );
    if (existing) return;

    const vocabItem = {
      word: result.word || record.query,
      reading: result.reading || '',
      meaningJp: result.meaningJp || '',
      meaningZh: result.meaningZh || '',
      source: 'expert',
      expertQueryId: record.id,
      industry: record.profileSnapshot.industry,
      level: record.profileSnapshot.level,
      tags: [],
      ...SM2.initItem(),
      created: new Date().toISOString()
    };

    Storage.add('vocabulary', vocabItem);
    Storage.linkToVocab(record.id, vocabItem.id);
    this.currentQuery = { ...record, addedToVocab: true, linkedWordId: vocabItem.id };
  },

  async renderHistory() {
    const userId = this._getCurrentUserId();
    const queries = Storage.getExpertQueries(userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 20);
    const container = document.getElementById('expert-history');
    if (!container) return;

    if (queries.length === 0) {
      container.innerHTML = '<p class="empty-hint">还没有查询记录</p>';
      return;
    }

    container.innerHTML = queries.map(q => {
      const date = new Date(q.createdAt);
      const dateStr = (date.getMonth() + 1) + '/' + date.getDate() + ' '
        + date.getHours().toString().padStart(2, '0') + ':'
        + date.getMinutes().toString().padStart(2, '0');
      const statusIcon = q.addedToVocab ? '✅' : '📋';
      return `
        <div class="card expert-history-item" data-action="view-history" data-id="${q.id}">
          <div class="expert-history-row">
            <div class="expert-history-text">
              <strong>${this.escapeHtml(q.query)}</strong>
              <span class="card-subtitle">${dateStr}</span>
            </div>
            <span class="expert-history-status">${statusIcon}</span>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('[data-action="view-history"]').forEach(el => {
      el.addEventListener('click', async () => {
        const q = Storage.getExpertQuery(el.dataset.id);
        if (q) {
          this.currentQuery = q;
          this.renderResult(q);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  },

  async loadLatest() {
    const userId = this._getCurrentUserId();
    const queries = Storage.getExpertQueries(userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 1);
    if (queries.length > 0) {
      this.currentQuery = queries[0];
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Expert = Expert;