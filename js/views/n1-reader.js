const N1Reader = {
  state: null,
  ocrWorker: null,
  ocrWorkerPromise: null,
  pdfjs: null,
  diagnosticLines: [],
  selectedText: '',
  selectedType: 'vocabulary',
  currentSentence: null,
  draftKey() { return `tsumori-n1-reader-draft-${Storage._getCurrentUserId() || 'guest'}`; },
  async init() { this.render(); this.bind(); this.renderSavedList(); this.restore(); },
  esc(value) { const d = document.createElement('div'); d.textContent = value || ''; return d.innerHTML; },
  render() {
    document.getElementById('main-content').innerHTML = `<header class="view-header"><h1>${t('page.readingWorkbench')}</h1><p class="view-subtitle">OCR后先校对原文，再一次性解析；句子详情不会重复请求AI。</p></header>
      <section class="card n1-library"><div><span class="n1-library-kicker">我的读解文章</span><select id="n1-saved-select" class="form-input"><option value="">选择已保存的文章…</option></select></div><div class="n1-library-actions"><button id="n1-open-saved" class="btn btn-primary">打开</button><button id="n1-new-reading" class="btn btn-secondary">新建</button><button id="n1-delete-saved" class="btn btn-secondary">删除</button></div></section><div id="n1-create-workspace" class="n1-create-workspace" hidden><div class="n1-steps"><div class="n1-step is-active"><b>1</b><span>导入并校对<br><small>OCR文字可以修改</small></span></div><div class="n1-step"><b>2</b><span>一次性解析<br><small>全文、题目全部生成</small></span></div><div class="n1-step"><b>3</b><span>逐句学习<br><small>点击句子查看详情</small></span></div></div>
      <section class="card n1-import"><div class="n1-review-heading"><div><span>第1步</span><h2>校对OCR文字</h2></div><p>这里是初次审核区。可以直接增删、纠正识别错误，再提交解析。</p></div><div class="n1-note-row"><label class="form-label" for="n1-note">文章备注（最多50字）</label><div><input id="n1-note" class="form-input" maxlength="50" placeholder="例如：2022年12月真题／需要重点复习"><span id="n1-note-count">0 / 50</span></div></div><div class="n1-import-grid"><div><label class="form-label">文章正文（可修改）</label><textarea id="n1-text" class="form-input n1-source" placeholder="粘贴日语文章，或选择多张截图/PDF自动OCR"></textarea></div><div><label class="form-label">题目和选项（可修改、可留空）</label><textarea id="n1-questions" class="form-input n1-source n1-questions" placeholder="例如：50  筆者が最も言いたいことは何か。\n1 ...  2 ..."></textarea><div class="n1-file-row"><label class="btn btn-secondary"><input id="n1-file" type="file" accept=".txt,.md,.pdf,image/*" multiple hidden>选择图片/PDF/文本（可多选）</label><span id="n1-file-name">尚未选择文件</span></div></div></div><div class="view-actions"><button id="n1-analyze" class="btn btn-primary">确认文字并一次性解析</button><button id="n1-split-questions" class="btn btn-secondary">尝试分离题目</button><span id="n1-status" class="n1-status"></span></div><details class="n1-diagnostics"><summary>OCR诊断日志（服务端引擎）</summary><pre id="n1-diagnostic-log">等待选择文件…</pre></details></section></div>
      <div id="n1-content-workspace" class="n1-content-workspace"><div class="n1-section-heading"><span>读解内容</span><h2>全文解析与逐句学习</h2><p>左侧点击原文，右侧显示对应解析；右侧选中文字可直接收藏。</p></div><div class="n1-layout"><section id="n1-result" class="n1-result"><div class="empty-hint">请选择一篇已保存的文章并点击“打开”，或者点击“新建”。</div></section><aside class="card n1-chat"><h2>会话窗</h2><div id="n1-chat-log" class="n1-chat-log"><p class="n1-chat-note">全文解析后，可继续询问文章、语法或题目。</p></div><div class="n1-chat-compose"><input id="n1-chat-input" class="form-input" placeholder="询问文章内容、语法或题目"><button id="n1-chat-send" class="btn btn-primary">发送</button></div></aside></div></div><div id="n1-selection-toolbar" class="n1-selection-toolbar" hidden><span id="n1-selection-type"></span><button id="n1-save-selection" type="button">收藏</button></div>`;
  },
  bind() {
    document.getElementById('n1-analyze').onclick = () => this.analyze();
    document.getElementById('n1-split-questions').onclick = () => this.splitQuestions();
    document.getElementById('n1-open-saved').onclick = () => this.openSaved();
    document.getElementById('n1-saved-select').onchange = event => { if (event.target.value) this.openSaved(); };
    document.getElementById('n1-new-reading').onclick = () => this.newReading();
    document.getElementById('n1-delete-saved').onclick = () => this.deleteSaved();
    document.getElementById('n1-save-selection').onclick = () => this.saveSelection();
    document.getElementById('n1-note').oninput = event => { document.getElementById('n1-note-count').textContent = `${event.target.value.length} / 50`; this.saveDraft(); };
    document.getElementById('n1-text').oninput = () => this.saveDraft();
    document.getElementById('n1-questions').oninput = () => this.saveDraft();
    document.getElementById('n1-file').onchange = e => this.readFiles(e.target.files);
    document.getElementById('n1-chat-send').onclick = () => this.chat();
    document.getElementById('n1-chat-input').onkeydown = e => { if (e.key === 'Enter') this.chat(); };
  },
  renderSavedList(selectedId = this.state?.id) {
    const select = document.getElementById('n1-saved-select');
    if (!select) return;
    const readings = Storage.getAll('n1_readings').slice().sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    select.innerHTML = '<option value="">保存済みの文章を選択…</option>' + readings.map(item => `<option value="${this.esc(item.id)}" ${item.id === selectedId ? 'selected' : ''}>${this.esc(this.japaneseTitle(item))} · ${new Date(item.updatedAt || item.createdAt).toLocaleDateString('ja-JP')}</option>`).join('');
  },
  japaneseTitle(record) {
    const title = String(record?.title || '').trim();
    if (/[ぁ-んァ-ヶ]/.test(title)) return title.slice(0, 42);
    const firstSentence = record?.analysis?.paragraphs?.flatMap(paragraph => paragraph.sentences || []).map(sentence => sentence.text).find(text => /[ぁ-んァ-ヶ]/.test(text || ''));
    if (firstSentence) return String(firstSentence).replace(/[。！？].*$/, '').slice(0, 42);
    const line = String(record?.text || '').split('\n').map(value => value.trim()).find(value => /[ぁ-んァ-ヶ]/.test(value));
    return (line || '無題の文章').slice(0, 42);
  },
  showCreateWorkspace() {
    document.getElementById('n1-create-workspace').hidden = false;
    document.getElementById('n1-content-workspace').hidden = true;
  },
  showContentWorkspace() {
    document.getElementById('n1-create-workspace').hidden = true;
    document.getElementById('n1-content-workspace').hidden = false;
  },
  openSaved() {
    const id = document.getElementById('n1-saved-select').value;
    const record = Storage.getById('n1_readings', id);
    if (!record) return;
    this.state = record;
    sessionStorage.setItem('tsumori-n1-reader', JSON.stringify(record));
    document.getElementById('n1-text').value = record.text || '';
    document.getElementById('n1-questions').value = (record.questions || []).join('\n');
    document.getElementById('n1-note').value = record.note || '';
    document.getElementById('n1-note-count').textContent = `${(record.note || '').length} / 50`;
    this.showContentWorkspace();
    this.renderResult();
    document.getElementById('n1-status').textContent = '正在编辑已保存文章；重新解析会更新这条记录。';
  },
  newReading() {
    sessionStorage.removeItem('tsumori-n1-reader');
    localStorage.removeItem(this.draftKey());
    this.state = null;
    document.getElementById('n1-text').value = '';
    document.getElementById('n1-questions').value = '';
    document.getElementById('n1-note').value = '';
    document.getElementById('n1-note-count').textContent = '0 / 50';
    document.getElementById('n1-result').innerHTML = '<div class="empty-hint">校对完成后，点击“确认文字并一次性解析”。</div>';
    this.renderSavedList(null);
    this.showCreateWorkspace();
    document.getElementById('n1-text').focus();
  },
  deleteSaved() {
    const id = document.getElementById('n1-saved-select').value;
    if (!id || !confirm('确定删除这篇已保存的读解文章吗？')) return;
    Storage.remove('n1_readings', id);
    if (this.state?.id === id) {
      this.state = null;
      sessionStorage.removeItem('tsumori-n1-reader');
      this.showContentWorkspace();
      document.getElementById('n1-result').innerHTML = '<div class="empty-hint">文章を選択するか、「新建」をクリックしてください。</div>';
    }
    this.renderSavedList(null);
  },
  splitQuestions() {
    const article = document.getElementById('n1-text');
    const questions = document.getElementById('n1-questions');
    const lines = article.value.split('\n');
    const start = lines.findIndex(line => /^\s*(?:4[6-9]|5\d)[\s　]+/.test(line));
    if (start < 0) {
      document.getElementById('n1-status').textContent = '没有检测到以46～59开头的题目，请手动剪切到右侧。';
      return;
    }
    questions.value = [questions.value.trim(), lines.slice(start).join('\n').trim()].filter(Boolean).join('\n');
    article.value = lines.slice(0, start).join('\n').trim();
    this.saveDraft();
    document.getElementById('n1-status').textContent = '已尝试分离题目，请校对左右两栏后再解析。';
  },
  async readFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    this.beginNewImport();
    this.diagnosticLines = [];
    const status = document.getElementById('n1-status');
    const input = document.getElementById('n1-file');
    const output = document.getElementById('n1-text');
    document.getElementById('n1-file-name').textContent = files.length === 1 ? files[0].name : `已选择 ${files.length} 个文件（按选择顺序处理）`;
    input.disabled = true;
    const parts = output.value.trim() ? [output.value.trim()] : [];
    const failures = [];
    let successful = 0;
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      status.textContent = `正在处理第 ${index + 1}/${files.length} 个文件：${file.name}`;
      this.logDiagnostic(`开始处理文件 ${index + 1}/${files.length}`, file.name);
      try {
        let text;
        if (file.type.startsWith('image/')) text = await this.ocrImage(file, index + 1, files.length);
        else if (file.name.toLowerCase().endsWith('.pdf')) text = await this.ocrPdf(file, index + 1, files.length);
        else text = (await file.text()).trim();
        if (!text) throw new Error('没有识别到文字');
        parts.push(text);
        successful++;
        output.value = parts.join('\n\n');
        this.saveDraft();
        this.logDiagnostic(`文件 ${index + 1}/${files.length} 处理完成`, file.name);
      } catch (error) {
        failures.push(`${file.name}：${this.errorMessage(error)}`);
        this.logDiagnostic(`文件 ${index + 1}/${files.length} 处理失败`, failures.at(-1));
      }
    }
    input.disabled = false;
    input.value = '';
    if (!successful && !output.value.trim()) {
      status.textContent = `没有成功识别文件。${failures.join('；')}`;
    } else if (failures.length) {
      status.textContent = `本次已按顺序追加 ${successful}/${files.length} 个文件；${failures.length} 个失败，请查看诊断日志。`;
    } else {
      status.textContent = `已按顺序追加 ${files.length} 个文件并暂存，请确认文字后点击解析全文。`;
    }
    this.saveDraft();
  },
  saveDraft() {
    if (this.state?.analysis) return;
    const text = document.getElementById('n1-text')?.value || '';
    const questions = document.getElementById('n1-questions')?.value || '';
    const note = document.getElementById('n1-note')?.value || '';
    if (!text && !questions && !note) return;
    localStorage.setItem(this.draftKey(), JSON.stringify({ text, questions, note, updatedAt: new Date().toISOString() }));
  },
  restoreDraft() {
    let draft;
    try { draft = JSON.parse(localStorage.getItem(this.draftKey())); } catch { return false; }
    if (!draft || (!draft.text && !draft.questions && !draft.note)) return false;
    document.getElementById('n1-text').value = draft.text || '';
    document.getElementById('n1-questions').value = draft.questions || '';
    document.getElementById('n1-note').value = draft.note || '';
    document.getElementById('n1-note-count').textContent = `${(draft.note || '').length} / 50`;
    document.getElementById('n1-status').textContent = '已恢复上次暂存的OCR内容；再次选择图片会继续追加。';
    this.showCreateWorkspace();
    return true;
  },
  beginNewImport() {
    if (!this.state?.id) return;
    this.state = null;
    sessionStorage.removeItem('tsumori-n1-reader');
    document.getElementById('n1-note').value = '';
    document.getElementById('n1-note-count').textContent = '0 / 50';
    document.getElementById('n1-questions').value = '';
    document.getElementById('n1-result').innerHTML = '<div class="empty-hint">新资料已导入。校对完成后，将保存为一篇新文章。</div>';
    document.getElementById('n1-status').textContent = '已切换为新文章，不会覆盖列表中的旧文章。';
    this.renderSavedList(null);
  },
  errorMessage(error) {
    if (error?.message) return error.message;
    if (typeof error === 'string') return error;
    if (error?.type === 'error') return '外部OCR组件加载失败，请检查网络或内容安全策略';
    return '发生未知错误，请刷新页面后重试';
  },
  logDiagnostic(message, data = '') {
    const time = new Date().toLocaleTimeString();
    const detail = data ? ` ${typeof data === 'string' ? data : JSON.stringify(data)}` : '';
    const line = `[${time}] ${message}${detail}`;
    this.diagnosticLines.push(line);
    console.info('[読解 OCR]', message, data);
    const output = document.getElementById('n1-diagnostic-log');
    if (output) output.textContent = this.diagnosticLines.join('\n');
  },
  async checkOcrAssets() {
    const assets = [
      '/vendor/tesseract/tesseract.min.js',
      '/vendor/tesseract/worker.min.js',
      '/vendor/tesseract-core/tesseract-core-simd-lstm.wasm.js',
      '/vendor/tessdata/jpn.traineddata.gz'
    ];
    this.logDiagnostic('开始检查本地OCR资源');
    for (const asset of assets) {
      const response = await fetch(asset, { method: 'HEAD', cache: 'no-store' });
      const size = response.headers.get('content-length') || 'unknown';
      this.logDiagnostic(`${asset} → HTTP ${response.status}, ${size} bytes`);
      if (!response.ok) throw new Error(`本地OCR资源不可用：${asset}（HTTP ${response.status}）`);
    }
  },
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (existing.dataset.loaded === 'true') resolve();
        else {
          existing.addEventListener('load', resolve, { once: true });
          existing.addEventListener('error', () => reject(new Error(`无法加载 ${src}`)), { once: true });
        }
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.crossOrigin = 'anonymous';
      script.onload = () => { script.dataset.loaded = 'true'; resolve(); };
      script.onerror = () => reject(new Error(`无法加载OCR组件：${src}`));
      document.head.appendChild(script);
    });
  },
  async getOcrWorker(status) {
    if (this.ocrWorker) return this.ocrWorker;
    if (this.ocrWorkerPromise) return this.ocrWorkerPromise;
    this.ocrWorkerPromise = (async () => {
      await this.checkOcrAssets();
      if (!window.Tesseract) await this.loadScript('/vendor/tesseract/tesseract.min.js');
      this.logDiagnostic(`Tesseract.js 已加载：${Tesseract.version || '5.x'}`);
      const workerPromise = Tesseract.createWorker('jpn', 1, {
        workerPath: '/vendor/tesseract/worker.min.js',
        corePath: '/vendor/tesseract-core',
        langPath: '/vendor/tessdata',
        workerBlobURL: false,
        errorHandler: error => {
          const message = this.errorMessage(error);
          this.logDiagnostic('worker内部错误', message);
          console.error('読解 OCR worker error:', error);
        },
        logger: message => {
          this.logDiagnostic(message.status || 'worker event', Number.isFinite(message.progress) ? `${Math.round(message.progress * 100)}%` : '');
          if (!status?.isConnected || !message.status) return;
          const percent = Number.isFinite(message.progress) ? ` ${Math.round(message.progress * 100)}%` : '';
          status.textContent = `OCR：${message.status}${percent}`;
        }
      });
      const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('OCR初始化超过90秒；请展开诊断日志查看最后一个成功资源')), 90000));
      const worker = await Promise.race([workerPromise, timeout]);
      this.logDiagnostic('日语OCR worker 初始化完成');
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        preserve_interword_spaces: '1'
      });
      this.ocrWorker = worker;
      return worker;
    })();
    try {
      return await this.ocrWorkerPromise;
    } catch (error) {
      this.ocrWorkerPromise = null;
      throw error;
    }
  },
  async prepareImage(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.max(1, Math.min(2.5, 2400 / bitmap.width));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    context.filter = 'grayscale(1) contrast(1.35)';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas;
  },
  async requestServerOcr(imageData, status) {
    this.logDiagnostic('上传图片到服务端OCR', `${Math.round(imageData.length / 1024)} KB`);
    status.textContent = '图片已上传，服务端正在进行日语OCR…';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${Auth.token()}`
        },
        body: JSON.stringify({ image: imageData }),
        signal: controller.signal
      });
      const result = await response.json().catch(() => ({}));
      this.logDiagnostic(`服务端OCR响应 HTTP ${response.status}`, result.confidence == null ? '' : `置信度 ${Math.round(result.confidence)}%`);
      if (!response.ok) throw new Error(result.error || `服务端OCR请求失败（HTTP ${response.status}）`);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('服务端OCR超过3分钟未完成');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  },
  async ocrImage(file, fileNumber = 1, fileTotal = 1) {
    const status = document.getElementById('n1-status'); status.textContent = `正在准备第 ${fileNumber}/${fileTotal} 张图片…`;
    this.logDiagnostic('收到图片', `${file.name}, ${file.type || 'unknown'}, ${file.size} bytes`);
    const image = await this.prepareImage(file);
    this.logDiagnostic('图片增强完成', `${image.width}×${image.height}`);
    const result = await this.requestServerOcr(image.toDataURL('image/png'), status);
    const text = result?.text?.trim();
    if (!text) throw new Error('没有识别到文字，请换用更清晰的截图');
    return text;
  },
  async ocrPdf(file, fileNumber = 1, fileTotal = 1) {
    const status = document.getElementById('n1-status'); status.textContent = `正在读取第 ${fileNumber}/${fileTotal} 个文件的PDF页面…`;
    if (!this.pdfjs) this.pdfjs = await import('/vendor/pdf/pdf.min.mjs');
    this.pdfjs.GlobalWorkerOptions.workerSrc = '/vendor/pdf/pdf.worker.min.mjs';
    const pdf = await this.pdfjs.getDocument({ data: await file.arrayBuffer(), isEvalSupported: false }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      status.textContent = `文件 ${fileNumber}/${fileTotal}：正在OCR第 ${pageNumber}/${pdf.numPages} 页…`;
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      const result = await this.requestServerOcr(canvas.toDataURL('image/png'), status);
      if (result?.text?.trim()) pages.push(result.text.trim());
    }
    if (!pages.length) throw new Error('没有识别到文字，请确认PDF页面清晰可见');
    return pages.join('\n\n');
  },
  async analyze() {
    const text = document.getElementById('n1-text').value.trim();
    if (!text) return;
    const status = document.getElementById('n1-status'); status.textContent = '正在一次性解析全文，请稍候…';
    document.getElementById('n1-analyze').disabled = true;
    try {
      const questions = document.getElementById('n1-questions').value.split(/\n+/).map(s => s.trim()).filter(Boolean);
      const analysis = await AIProvider.analyzeN1Article(text, questions);
      const now = new Date().toISOString();
      const draft = { text, analysis, title: analysis.title };
      const data = { text, questions, note: document.getElementById('n1-note').value.trim().slice(0, 50), analysis, quizProgress: this.state?.quizProgress || {}, title: this.japaneseTitle(draft), createdAt: this.state?.createdAt || now, updatedAt: now };
      this.state = this.state?.id ? Storage.update('n1_readings', this.state.id, data) : Storage.add('n1_readings', data);
      sessionStorage.setItem('tsumori-n1-reader', JSON.stringify(this.state));
      this.renderSavedList(this.state.id); this.showContentWorkspace(); this.renderResult(); status.textContent = '解析完成并已保存。点击左侧句子，在右侧学习。';
    } catch (e) { status.textContent = e.message; } finally { document.getElementById('n1-analyze').disabled = false; }
  },
  restore() { try { this.state = JSON.parse(sessionStorage.getItem('tsumori-n1-reader')); } catch {} if (this.state?.analysis) { document.getElementById('n1-text').value = this.state.text || ''; document.getElementById('n1-questions').value = (this.state.questions || []).join('\n'); document.getElementById('n1-note').value = this.state.note || ''; document.getElementById('n1-note-count').textContent = `${(this.state.note || '').length} / 50`; this.renderSavedList(this.state.id); this.showContentWorkspace(); this.renderResult(); } else { this.restoreDraft(); } },
  renderResult() {
    const a = this.state.analysis || {}; const root = document.getElementById('n1-result');
    root.innerHTML = `<div class="n1-reader-split"><div class="n1-paper card"><div class="n1-ready-banner">原文 · 点击任意带编号的句子</div>${(a.paragraphs || []).map((p, pi) => `<section class="n1-paragraph">${(p.sentences || []).map((s, si) => `<button class="n1-sentence" data-p="${pi}" data-s="${si}" title="点击在右侧查看详细解析"><span>${pi + 1}-${si + 1}</span>${this.esc(s.text)}</button>`).join('')}</section>`).join('')}</div><section id="n1-sentence-detail" class="n1-detail card"><div class="n1-detail-empty"><b>句子解析</b><p>请点击左侧任意句子。解析会显示在这里。</p><small>右侧文字可以用鼠标选择并收藏。</small></div></section></div><div class="card n1-question-panel"><h3>阅读测试</h3>${this.renderQuiz(a.questions || [])}</div>`;
    root.querySelectorAll('.n1-sentence').forEach(btn => btn.onclick = () => this.showSentence(Number(btn.dataset.p), Number(btn.dataset.s)));
    root.querySelectorAll('[data-check-question]').forEach(button => button.onclick = () => this.checkQuestion(Number(button.dataset.checkQuestion)));
    document.getElementById('n1-sentence-detail').addEventListener('mouseup', () => setTimeout(() => this.captureSelection(), 0));
  },
  renderQuiz(questions) {
    if (!questions.length) return '<p class="n1-summary">本次没有识别到题目。可返回上方题目栏补充后重新解析。</p>';
    const progress = this.state.quizProgress || {};
    return questions.map((question, index) => {
      const saved = progress[index] || {};
      const choices = Array.isArray(question.choices) ? question.choices : [];
      const feedback = saved.correct == null ? `参考答案：${this.esc(question.answer)}` : (saved.correct ? '回答正确' : `回答错误，正确答案是 ${this.esc(question.answer)}`);
      return `<article class="n1-quiz-card" data-question="${index}"><p class="n1-quiz-question"><b>${index + 1}</b>${this.esc(question.question)}</p><div class="n1-quiz-choices">${choices.map(choice => `<label class="n1-quiz-choice"><input type="radio" name="n1-question-${index}" value="${this.esc(choice.label)}" ${saved.selected === String(choice.label) ? 'checked' : ''} ${saved.revealed ? 'disabled' : ''}><span><b>${this.esc(choice.label)}</b>${this.esc(choice.text)}</span></label>`).join('') || '<p class="n1-summary">未能提取选项，可以查看参考答案。</p>'}</div><button class="btn btn-primary btn-sm" data-check-question="${index}" ${saved.revealed ? 'disabled' : ''}>${saved.revealed ? '已查看答案' : '查看答案'}</button><div class="n1-quiz-feedback ${saved.correct === true ? 'is-correct' : saved.correct === false ? 'is-wrong' : ''}" ${saved.revealed ? '' : 'hidden'}>${feedback}</div><div class="n1-quiz-analysis" ${saved.revealed ? '' : 'hidden'}><h4>答案解析</h4><p>${this.esc(question.reasonZh)}</p><p><b>易错点：</b>${this.esc(question.trap)}</p></div></article>`;
    }).join('');
  },
  checkQuestion(index) {
    const question = this.state.analysis.questions[index];
    const card = document.querySelector(`[data-question="${index}"]`);
    const selected = card.querySelector(`input[name="n1-question-${index}"]:checked`)?.value || '';
    const choices = Array.isArray(question.choices) ? question.choices : [];
    if (choices.length && !selected) {
      document.getElementById('n1-status').textContent = '请先选择一个选项。';
      return;
    }
    const answer = String(question.answer || '').trim();
    const answerLabel = answer.match(/[1-4]/)?.[0] || answer;
    const correct = choices.length ? selected === answerLabel : null;
    this.state.quizProgress = { ...(this.state.quizProgress || {}), [index]: { selected, correct, revealed: true } };
    if (this.state.id) this.state = Storage.update('n1_readings', this.state.id, { quizProgress: this.state.quizProgress, updatedAt: new Date().toISOString() });
    sessionStorage.setItem('tsumori-n1-reader', JSON.stringify(this.state));
    this.renderResult();
    document.querySelector(`[data-question="${index}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  },
  showSentence(pi, si) {
    const s = this.state.analysis.paragraphs[pi].sentences[si]; const root = document.getElementById('n1-result');
    root.querySelectorAll('.n1-sentence').forEach(button => button.classList.toggle('is-selected', Number(button.dataset.p) === pi && Number(button.dataset.s) === si));
    this.currentSentence = s;
    const el = document.getElementById('n1-sentence-detail'); el.innerHTML = `<div class="n1-detail-label">已缓存解析 · 选择文字可收藏</div><h3>句子解析</h3><p class="n1-detail-jp">${this.esc(s.text)}</p><p class="n1-translation">${this.esc(s.translationZh)}</p><h4>关键语法</h4>${(s.grammar || []).map(g => `<p><b>${this.esc(g.point)}</b>：${this.esc(g.meaningZh)}<br><small>${this.esc(g.note)}</small></p>`).join('') || '<p>暂无特别语法点</p>'}<h4>单词与例句</h4>${(s.vocabulary || []).map(v => `<p><b>${this.esc(v.word)}</b>（${this.esc(v.reading)}）${this.esc(v.pos)}：${this.esc(v.meaningZh)}<br><small>例：${this.esc(v.example)}</small></p>`).join('') || '<p>暂无重点单词</p>'}<h4>易错点</h4><p>${this.esc(s.mistakes || '暂无')}</p>`;
  },
  captureSelection() {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    const detail = document.getElementById('n1-sentence-detail');
    const anchor = selection?.anchorNode;
    const toolbar = document.getElementById('n1-selection-toolbar');
    if (!text || !anchor || !detail.contains(anchor)) { toolbar.hidden = true; return; }
    this.selectedText = text;
    this.selectedType = text.length >= 10 || /[。！？!?\s]/.test(text) ? 'phrases' : 'vocabulary';
    const label = this.selectedType === 'phrases' ? '句子库' : '词库';
    document.getElementById('n1-selection-type').textContent = `自动判断：${label}`;
    document.getElementById('n1-save-selection').textContent = `加入${label}`;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    toolbar.style.left = `${Math.min(rect.left, window.innerWidth - 190)}px`;
    toolbar.style.top = `${Math.max(8, rect.bottom + 8)}px`;
    toolbar.hidden = false;
  },
  saveSelection() {
    const text = this.selectedText.trim();
    if (!text || !this.currentSentence) return;
    if (this.selectedType === 'phrases') {
      const grammar = (this.currentSentence.grammar || []).find(item => item.point.includes(text) || text.includes(item.point));
      Storage.add('phrases', { japanese: text, reading: '', chinese: text === this.currentSentence.text ? this.currentSentence.translationZh : (grammar?.meaningZh || ''), industry: 'none', scene: '读解', role: '', intent: '', tone: 'neutral', variants: [], category: 'other', sourceReadingId: this.state.id, ...SM2.initItem(), created: new Date().toISOString() });
    } else {
      const vocabulary = (this.currentSentence.vocabulary || []).find(item => item.word === text || text.includes(item.word));
      Storage.add('vocabulary', { word: text, reading: vocabulary?.reading || '', meaningJp: '', meaningZh: vocabulary?.meaningZh || '', sourceReadingId: this.state.id, ...SM2.initItem(), created: new Date().toISOString() });
    }
    document.getElementById('n1-selection-toolbar').hidden = true;
    document.getElementById('n1-status').textContent = `“${text}”已加入${this.selectedType === 'phrases' ? '句子库' : '词库'}。`;
    window.getSelection()?.removeAllRanges();
  },
  async chat() {
    const input = document.getElementById('n1-chat-input'); const q = input.value.trim(); if (!q || !this.state) return;
    const log = document.getElementById('n1-chat-log'); log.insertAdjacentHTML('beforeend', `<p class="n1-chat-user">${this.esc(q)}</p>`); input.value = '';
    try { const result = await AIProvider.analyzeWord(`基于以下文章回答问题：${this.state.text}\n问题：${q}`, { sourceLanguage: 'ja', targetLanguage: 'zh', level: 'n1', maxExamples: 3 }); log.insertAdjacentHTML('beforeend', `<p class="n1-chat-ai">${this.esc(result.translation || result.meaningZh || result.grammarNotes || '暂无回答')}</p>`); } catch (e) { log.insertAdjacentHTML('beforeend', `<p class="n1-chat-ai">${this.esc(e.message)}</p>`); }
    log.scrollTop = log.scrollHeight;
  },
  destroy() {
    if (this.ocrWorker) this.ocrWorker.terminate();
    this.ocrWorker = null;
    this.ocrWorkerPromise = null;
  }
};
window.N1Reader = N1Reader;
