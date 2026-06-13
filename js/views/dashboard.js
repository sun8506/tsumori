/**
 * Dashboard View 驤･?蟋｣蠎｢貉樣渇蘒ｾ蜆ｩ驫臥ｬｺ蜆・ * 
 * 蟋｣蠎｢譽ｩ驫・・﨡溽ｼ域飼蟋ｸ螽我ｽｵ蛟ｰ逅帙┤縺夐括讀ｼ竄ｬ菴ｸ莠ｬ郛域視蛟ｰ扈・・ｊ驫・ｬ榊驫・ */

const Dashboard = {
  async init() {
    this.render();
    await this.refreshData();
  },

  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <header class="dash-header">
        <h1>蟋｣蠎｢貉樣渇蘒ｾ蜆ｩ驫臥ｬｺ蜆・</h1>
        <p class="dash-date" id="dash-date"><</p>
      <</header>
      <section class="dash-stats">
        <div class="stat-card">
          <div class="stat-icon">鬥・綜<</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-total">0<</span>
            <span class="stat-label">Total Words</span>
          <</div>
        <</div>
        <div class="stat-card">
          <div class="stat-icon">驤ｴ?</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-due">0<</span>
            <span class="stat-label">Reviews Due<</span>
          <</div>
        <</div>
        <div class="stat-card">
          <div class="stat-icon">驩・</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-new">0<</span>
            <span class="stat-label">New Words Today</span>
          <</div>
        <</div>
        <div class="stat-card">
          <div class="stat-icon">鬥・ｼｳ<</div>
          <div class="stat-info">
            <span class="stat-value" id="stat-mastered">0<</span>
            <span class="stat-label">Mastery<</span>
          <</div>
        <</div>
      <</section>
      <section class="dash-section">
        <h2>Today Due</h2>
        <div id="due-list"><</div>
      <</section>
      <section class="dash-section">
        <h2>Review History<</h2>
        <div id="recent-articles"><</div>
      <</section>
      <section class="dash-section">
        <button class="btn btn-primary" id="btn-refresh">鬥・肌 驫牙屶蜈鈴活陬､蛟ｰ髀・ｭ俶汪<</button>
      <</section>
    `;

    this.bindEvents();
    this.updateDate();
    this.updateStats();
    this.renderDueList();
    this.renderRecentArticles();
  },

  bindEvents() {
    document.getElementById('btn-refresh').addEventListener('click', async () => {
      await this.refreshData();
    });
  },

  updateDate() {
    const el = document.getElementById('dash-date');
    if (!el) return;
    const now = new Date();
    const opts = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
    el.textContent = now.toLocaleDateString('ja-JP', opts);
  },

  updateStats() {
    const words = Storage.getAll('vocabulary');
    const stats = SM2.getStats(words);

    const set = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    set('stat-total', stats.total);
    set('stat-due', stats.due);
    set('stat-new', stats.new);
    set('stat-mastered', stats.mastered);
  },

  renderDueList() {
    const words = Storage.getAll('vocabulary');
    const due = SM2.getDue(words);
    const container = document.getElementById('due-list');
    if (!container) return;

    if (due.length === 0) {
      container.innerHTML = '<p class="empty-hint">蟇ｰ笊・ｹ乗ｵ懷晉弊驫・・莠鈴活螽ｿ莨ｨ驫・ｶ門ｱ 鬥・ｸ<</p>';
      return;
    }

    container.innerHTML = due.slice(0, 5).map(item => `
      <div class="card">
        <div class="card-header">
          <strong>${this.escapeHtml(item.word)}<</strong>
          <span class="card-subtitle">${this.escapeHtml(item.reading || '')}<</span>
        <</div>
        <p class="card-subtitle">Mastery? ${'\u2605.repeat(item.mastery)}${'\u2605.repeat(5 - item.mastery)}<</p>
      <</div>
    `).join('');
  },

  renderRecentArticles() {
    const articles = Storage.getAll('articles');
    const container = document.getElementById('recent-articles');
    if (!container) return;

    if (articles.length === 0) {
      container.innerHTML = '<p class="empty-hint">No review history yet.<</p>';
      return;
    }

    container.innerHTML = articles.slice(-3).reverse().map(a => `
      <div class="card" style="cursor:pointer" data-action="view-article" data-id="${a.id}">
        <div class="card-header">
          <strong>${this.escapeHtml(a.title)}<</strong>
          <span class="card-subtitle">${new Date(a.date).toLocaleDateString('ja-JP')}<</span>
        <</div>
        <p class="card-subtitle">${this.escapeHtml(a.japanese?.substring(0, 80) || '')}...<</p>
      <</div>
    `).join('');

    container.querySelectorAll('[data-action="view-article"]').forEach(el => {
      el.addEventListener('click', () => {
        window.location.hash = 'article';
        if (window.Router) window.Router.go('article');
      });
    });
  },

  async refreshData() {
    const btn = document.getElementById('btn-refresh');
    if (btn) { btn.textContent = '鬥・肌 髀・ｭ俶汪豸・..'; btn.disabled = true; }

    try {
      await NHK.fetchAndSaveToday();
    } catch (e) {
      console.warn('Auto fetch failed:', e.message);
    }

    this.updateStats();
    this.renderDueList();
    this.renderRecentArticles();

    if (btn) { btn.textContent = '鬥・肌 驫牙屶蜈鈴活陬､蛟ｰ髀・ｭ俶汪'; btn.disabled = false; }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Dashboard = Dashboard;