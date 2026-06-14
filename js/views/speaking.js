const Speaking = {
  recognition: null,
  isRecording: false,

  async init() {
    this.render();
  },

  render() {
    document.getElementById('main-content').innerHTML = `
      <header class="view-header">
        <h1>Speaking Practice</h1>
        <p class="view-subtitle">Listen to Japanese text and compare your pronunciation when speech recognition is available.</p>
      </header>
      <div class="card">
        <div class="form-group">
          <label class="form-label">Text to practice</label>
          <textarea class="form-input" id="input-text" rows="4" placeholder="例: 今日は日本語を練習します。"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Playback speed</label>
          <input class="form-input" type="range" id="input-speed" min="0.5" max="1.5" step="0.1" value="0.9">
          <span class="card-subtitle" id="speed-label">0.9x</span>
        </div>
        <div class="speaking-actions">
          <button class="btn btn-primary" id="btn-speak">Play audio</button>
          <button class="btn btn-secondary" id="btn-record">Start recording</button>
        </div>
      </div>
      <div class="card speaking-card">
        <p class="speaking-main" id="display-text">${t('speaking.placeholder')}</p>
      </div>
      <div id="result-area"></div>
    `;

    document.getElementById('input-text').addEventListener('input', event => {
      document.getElementById('display-text').textContent = event.target.value || t('speaking.placeholder');
    });
    document.getElementById('input-speed').addEventListener('input', event => {
      document.getElementById('speed-label').textContent = event.target.value + 'x';
    });
    document.getElementById('btn-speak').addEventListener('click', () => this.speak());
    document.getElementById('btn-record').addEventListener('click', () => this.toggleRecording());
  },

  speak() {
    const text = document.getElementById('input-text').value.trim();
    if (!text) {
      alert('Please enter text first.');
      return;
    }
    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not available in this browser.');
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.rate = Number(document.getElementById('input-speed').value);
    speechSynthesis.speak(utterance);
  },

  toggleRecording() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not available in this browser.');
      return;
    }
    if (this.isRecording && this.recognition) {
      this.recognition.stop();
      return;
    }

    const expected = document.getElementById('input-text').value.trim();
    if (!expected) {
      alert('Please enter text first.');
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.isRecording = true;
    document.getElementById('btn-record').textContent = 'Stop recording';
    document.getElementById('result-area').innerHTML = '<p class="empty-hint">Listening...</p>';

    this.recognition.onresult = event => {
      const transcript = event.results[0][0].transcript;
      const score = this.calculateSimilarity(transcript, expected);
      document.getElementById('result-area').innerHTML = `
        <div class="card score-result">
          <p><strong>Transcript:</strong> ${this.escapeHtml(transcript)}</p>
          <p><strong>Expected:</strong> ${this.escapeHtml(expected)}</p>
          <p><strong>Similarity:</strong> ${score}%</p>
        </div>
      `;
    };
    this.recognition.onerror = event => {
      document.getElementById('result-area').innerHTML = `<p class="empty-hint">Recognition error: ${this.escapeHtml(event.error)}</p>`;
    };
    this.recognition.onend = () => {
      this.isRecording = false;
      document.getElementById('btn-record').textContent = 'Start recording';
    };
    this.recognition.start();
  },

  calculateSimilarity(a, b) {
    if (!a || !b) return 0;
    const longer = a.length >= b.length ? a : b;
    const shorter = a.length >= b.length ? b : a;
    const distance = this.levenshteinDistance(longer, shorter);
    return Math.max(0, Math.round((1 - distance / longer.length) * 100));
  },

  levenshteinDistance(a, b) {
    const dp = Array.from({ length: b.length + 1 }, (_, i) => [i]);
    for (let j = 0; j <= a.length; j += 1) dp[0][j] = j;
    for (let i = 1; i <= b.length; i += 1) {
      for (let j = 1; j <= a.length; j += 1) {
        dp[i][j] = b[i - 1] === a[j - 1]
          ? dp[i - 1][j - 1]
          : Math.min(dp[i - 1][j - 1], dp[i][j - 1], dp[i - 1][j]) + 1;
      }
    }
    return dp[b.length][a.length];
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};

window.Speaking = Speaking;
