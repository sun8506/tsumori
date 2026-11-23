const N1Column = {
  frame: null,
  syncTimer: null,
  lastSnapshot: '',

  init() {
    this.restoreProgress();
    this.render();
    this.bind();
    this.startSync();
  },

  destroy() {
    clearInterval(this.syncTimer);
    this.syncTimer = null;
    this.persistProgress();
  },

  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <header class="view-header n1-column-header">
        <div>
          <h1>N1 专栏</h1>
          <p class="view-subtitle">专项突破与历年实战集中训练，作答进度会随当前账户保存。</p>
        </div>
        <a class="btn btn-secondary" href="#reading"><i data-lucide="scan-text"></i> 阅读工作台</a>
      </header>
      <nav class="n1-column-switcher" aria-label="N1训练内容">
        <button class="is-active" data-n1-page="index.html">专项训练</button>
        <button data-n1-page="mock-2019-07.html">2019年7月</button>
        <button data-n1-page="mock-2021-12.html">2021年12月</button>
        <button data-n1-page="mock-2022-12.html">2022年12月</button>
        <button data-n1-page="mock-2023-12.html">2023年12月</button>
      </nav>
      <section class="n1-column-frame-shell">
        <div class="n1-column-frame-status"><span><i></i>训练进度已连接</span><button id="n1-open-window" type="button">在新窗口打开</button></div>
        <iframe id="n1-training-frame" title="N1训练系统" src="n1-training/index.html?embedded=1" loading="eager"></iframe>
      </section>`;
    this.frame = document.getElementById('n1-training-frame');
    if (window.lucide) lucide.createIcons();
  },

  bind() {
    document.querySelectorAll('[data-n1-page]').forEach(button => {
      button.addEventListener('click', () => this.openPage(button.dataset.n1Page, button));
    });
    document.getElementById('n1-open-window').addEventListener('click', () => {
      window.open(this.frame.src, '_blank', 'noopener');
    });
  },

  openPage(page, activeButton) {
    this.persistProgress();
    this.frame.src = `n1-training/${page}?embedded=1`;
    document.querySelectorAll('[data-n1-page]').forEach(button => button.classList.toggle('is-active', button === activeButton));
  },

  progressKeys() {
    return Object.keys(localStorage).filter(key =>
      /^n1-(?:mock-.+-responses|.+-mistakes)$/.test(key)
    );
  },

  snapshot() {
    const values = {};
    this.progressKeys().forEach(key => { values[key] = localStorage.getItem(key); });
    return values;
  },

  restoreProgress() {
    const record = Storage.getAll('n1_exam_progress')[0];
    if (!record?.values) return;
    Object.entries(record.values).forEach(([key, value]) => {
      if (typeof value === 'string' && localStorage.getItem(key) == null) localStorage.setItem(key, value);
    });
  },

  persistProgress() {
    const values = this.snapshot();
    const serialized = JSON.stringify(values);
    if (serialized === this.lastSnapshot) return;
    this.lastSnapshot = serialized;
    Storage.saveAll('n1_exam_progress', [{ id: 'n1-training-progress', values, updatedAt: new Date().toISOString() }]);
  },

  startSync() {
    this.lastSnapshot = JSON.stringify(this.snapshot());
    this.syncTimer = setInterval(() => this.persistProgress(), 1500);
  }
};

window.N1Column = N1Column;
