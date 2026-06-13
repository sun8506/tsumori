/**
 * Speaking View 驤･?Speaking Practice * 
 * 髣雁・・千太蠍育鐙驫・あ蛟幃活螫ｨ蛛｣驫画冥蜈鈴活蠇懷・驫域屋蜿咲ｼ域視竄ｬ? */

const Speaking = {
  async init() {
    this.render();
    this.bindEvents();
  },

  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <header class="view-header">
        <h1>Speaking Practice</h1>
        <p class="view-subtitle">Practice pronunciation with speech recognition</p>
      <</header>
      <div class="speaking-settings">
        <div class="form-group">
          <label class="form-label">Enter Japanese text to practice</label>
          <textarea class="form-input" id="input-text" rows="3" placeholder="Type or paste Japanese text here...>Your text will appear here/textarea>
        <</div>
        <div class="form-group">
          <label class="form-label">Speed<</label>
          <input class="form-input" type="range" id="input-speed" min="0.5" max="1.5" step="0.1" value="0.8" style="width:100%">
          <span class="card-subtitle" id="speed-label">0.8x<</span>
        <</div>
      <</div>
      <div class="speaking-card card">
        <p class="speaking-main" id="display-text">Your text will appear here</p>
        <p class="speaking-reading" id="display-reading"><</p>
        <p class="speaking-translation" id="display-translation"><</p>
        <div class="speaking-actions">
          <button class="btn btn-primary" id="btn-speak">鬥・伐 髑ｱ轤ｪ莠ｸ<</button>
          <button class="btn btn-secondary" id="btn-record">鬥・ｸｳ 迹ｭ萓ｿ莉・</button>
        <</div>
      <</div>
      <div id="result-area"><</div>
    `;
  },

  bindEvents() {
    document.getElementById('input-text').addEventListener('input', (e) => {
      document.getElementById('display-text').textContent = e.target.value || 'Your text will appear here;
    });

    document.getElementById('input-speed').addEventListener('input', (e) => {
      document.getElementById('speed-label').textContent = e.target.value + 'x';
    });

    document.getElementById('btn-speak').addEventListener('click', () => {
      const text = document.getElementById('input-text').value;
      if (!text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = parseFloat(document.getElementById('input-speed').value);
      speechSynthesis.speak(utterance);
    });

    document.getElementById('btn-record').addEventListener('click', () => {
      this.toggleRecording();
    });
  },

  isRecording: false,
  recognition: null,

  async toggleRecording() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Please enter some text to practice speaking.');
      return;
    }

    if (this.isRecording) {
      this.recognition.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = false;

    const resultArea = document.getElementById('result-area');
    resultArea.innerHTML = '<div class="recording-indicator">鬥・文 髢ｷ譟･辣ｶ豸軟・竄ｬ?迹ｭ萓ｿ莉宣括螫ｨ莠ｼ驫・ｸｺ莠ｸ驫・完莉碁括?</div>';

    this.recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      const expected = document.getElementById('input-text').value.trim();
      const similarity = this.calculateSimilarity(transcript, expected);

      this.isRecording = false;
      resultArea.innerHTML = `
        <div class="score-result">
          <p><strong>Transcript</strong>髞・{this.escapeHtml(transcript)}<</p>
          <p><strong>Expected</strong>髞・{this.escapeHtml(expected)}<</p>
          <p style="color:var(--success);font-weight:700;margin-top:8px">Accuracy: ${Math.round(similarity)}%<</p>
          ${similarity > 80 ? '<p style="color:var(--success)">鬥・ｸ 扈ｱ迥ｳ讚樣活螟井ｻ宣括蜍ｶ邏・</p>' : similarity > 50 ? '<p style="color:var(--warning)">鬥・遣 驫亥ｘ莠樒￥謌吩ｻ宣縛?</p>' : '<p style="color:var(--danger)">鬥・荘 扈ｶ蟇ｸ郢城括讀ｼ莨ｨ驫・､ｼ蛟鈴括?</p>'}
        <</div>
      `;
    };

    this.recognition.onend = () => {
      this.isRecording = false;
    };

    this.recognition.onerror = (event) => {
      resultArea.innerHTML = `<p class="empty-hint">Error: ${this.escapeHtml(event.error)}<</p>`;
      this.isRecording = false;
    };

    this.recognition.start();
    this.isRecording = true;
  },

  calculateSimilarity(a, b) {
    if (!a || !b) return 0;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 100;
    const dist = this.levenshteinDistance(longer, shorter);
    return Math.round((1 - dist / longer.length) * 100);
  },

  levenshteinDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    return matrix[b.length][a.length];
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

window.Speaking = Speaking;