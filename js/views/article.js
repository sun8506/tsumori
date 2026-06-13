/**
 * Article View 驤･?Daily News
 * 
 * NHK News Web Easy 驫・・釚ｾ豬懷ｬｨ蛟ｰ髑ｷ﨟・ｫ企甑譬ｧ邱ｱ驫画・ﾐ帝暑諢ｩ蜈捺ｷ・ｿ・鐙驫・ｬ榊驫・ */

const Article = {
  async init() {
    this.render();
    this.bindEvents();
    await this.renderList();
  },

  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <header class="view-header">
        <h1>Daily News<</h1>
        <p class="view-subtitle">Read and listen to simplified Japanese news</p>
      <</header>
      <div class="view-actions">
        <button class="btn btn-primary" id="btn-fetch">鬥・測 豬蟀・｣ｩ驫・・蜆夜渇繝｣蜈鈴活蟷ｿ蛟ｰ骰呎ｧ邱ｱ<</button>
      <</div>
      <div id="article-list"><</div>
    `;
  },

  bindEvents() {
    document.getElementById('btn-fetch').addEventListener('click', async () => {
      await this.fetchToday();
    });
  },

  async fetchToday() {
    try {
      await NHK.fetchAndSaveToday();
      await this.renderList();
    } catch (e) {
      alert('Failed to fetch articles: ' + e.message);
    }
  },

  async showDetail(id) {
    const article = Storage.getById('articles', id);
    if (!article) return;

    const modal = document.getElementById('modal-container');
    modal.innerHTML = `
      <div class="modal-header">
        <h3>${this.escapeHtml(article.title)}<</h3>
        <button class="modal-close" onclick="window.Modal.close()">Close</button>
      <</div>
      <div class="modal-body">
        <p class="card-subtitle" style="margin-bottom:12px">${new Date(article.date).toLocaleDateString('ja-JP')}<</p>
        <div class="article-text">
          ${this.escapeHtml(article.japanese || '').replace(/\n/g, '<br>')}
        <</div>
        <details style="margin-top:16px">
          <summary style="cursor:pointer;color:var(--primary);font-weight:600">鬥・囹鬥・圜 豸軟・豬礼太轤ｶﾇ秘活謗輔・ｻ?/summary>
          <p class="article-translation" style="margin-top:8px">${this.escapeHtml(article.translation || '郛域・ﾇ秘括﨟ゆｻ・)}<</p>
        </details>
        <details style="margin-top:8px">
          <summary style="cursor:pointer;color:var(--primary);font-weight:600">鬥・綜 髢ｲ蠍稲屹迹ｾ轤ｲ邯・/summary>
          <div style="margin-top:8px">
            ${(article.vocab || []).map(v => `
              <div class="vocab-note">
                <strong>${this.escapeHtml(v.word)}<</strong>
                <span class="card-subtitle">${this.escapeHtml(v.reading || '')}<</span>
                <br>${this.escapeHtml(v.meaning || '')}
              <</div>
            `).join('')}
          <</div>
        </details>
      <</div>
    `;
  },

  async renderList() {
    const articles = Storage.getAll('articles');
    const container = document.getElementById('article-list');
    if (!container) return;

    if (articles.length === 0) {
      container.innerHTML = '<p class="empty-hint">No articles loaded. Click the button above to fetch the latest news from NHK News Web Easy.らｲ夜純繝｣莨・渇螫ｨ蜆ｱ驫臥ｬｺ蛛｣驫域視蜆蛾活・ｺ蜈る渇蠇懷・驫牙､井ｻ宣括・ｺ莠ｸ驫・完莉碁括蜍ｩ竄ｬ?</p>';
      return;
    }

    container.innerHTML = articles.slice().reverse().map(a => `
      <div class="card article-preview" data-action="view-article" data-id="${a.id}">
        <div class="card-header">
          <strong>${this.escapeHtml(a.title)}<</strong>
          <span class="card-subtitle">${new Date(a.date).toLocaleDateString('ja-JP')}<</span>
        <</div>
        <p class="card-subtitle">${this.escapeHtml(a.japanese?.substring(0, 100) || '')}...<</p>
      <</div>
    `).join('');

    container.querySelectorAll('[data-action="view-article"]').forEach(el => {
      el.addEventListener('click', () => this.showDetail(el.dataset.id));
    });
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Article = Article;