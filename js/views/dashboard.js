const Dashboard = {
  expandedDate: null,

  async init() {
    this.render();
  },

  render() {
    const words = Storage.getAll('vocabulary');
    const phrases = Storage.getAll('phrases');
    const articles = Storage.getAll('articles');
    const stats = SM2.getStats(words);
    const due = SM2.getDue(words);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    const todaySummary = this.buildSummary(today, words, phrases, articles);
    const yesterdaySummary = this.buildSummary(yesterday, words, phrases, articles);
    const todayRecord = Storage.saveLearningRecord(today, {
      ...todaySummary,
      checkedIn: Storage.getLearningRecord(today)?.checkedIn || false
    });
    const recentRecords = this.buildRecentRecords(7, words, phrases, articles);
    const yesterdayFocus = this.getFocusItems(yesterday, words, phrases, articles);
    const main = document.getElementById('main-content');

    main.innerHTML = `
      <header class="learning-hero">
        <div>
          <p class="learning-eyebrow">DAILY LEARNING</p>
          <h1>${t('dash.hero', { greeting: this.getGreeting() })}</h1>
          <p class="dash-date">${I18n.date(today, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
          })}</p>
        </div>
        <button class="checkin-button ${todayRecord.checkedIn ? 'is-checked' : ''}" id="btn-checkin">
          <span class="checkin-icon"><i data-lucide="${todayRecord.checkedIn ? 'check' : 'calendar-check'}"></i></span>
          <span>
            <strong>${todayRecord.checkedIn ? t('dash.checked') : t('dash.checkin')}</strong>
            <small>${todayRecord.checkedIn ? t('dash.saved') : t('dash.checkinHint')}</small>
          </span>
        </button>
      </header>

      <section class="yesterday-card">
        <div class="yesterday-copy">
          <span class="section-kicker">${t('dash.yesterday')}</span>
          <h2>${yesterdaySummary.total ? t('dash.yesterdayDone', { count: yesterdaySummary.total }) : t('dash.yesterdayEmpty')}</h2>
          <p>${this.summarySentence(yesterdaySummary, true)}</p>
        </div>
        <div class="focus-list">
          ${yesterdayFocus.length ? yesterdayFocus.map(item => `
            <div class="focus-item">
              <span class="focus-type">${item.type}</span>
              <strong>${this.escapeHtml(item.title)}</strong>
              <small>${this.escapeHtml(item.detail)}</small>
            </div>
          `).join('') : `
            <div class="focus-empty">
              <i data-lucide="moon-star"></i>
              <span>${t('dash.focusEmpty')}</span>
            </div>
          `}
        </div>
        <button class="btn btn-primary quick-review-button" id="btn-go-review">
          <i data-lucide="rotate-ccw"></i>
          ${t('dash.quickReview')}${due.length ? ` · ${t('dash.due', { count: due.length })}` : ''}
        </button>
      </section>

      <section class="today-report">
        <div class="section-heading">
          <div>
            <span class="section-kicker">${t('dash.todayResults')}</span>
            <h2>${t('dash.dailyReport')}</h2>
          </div>
          <span class="report-status">${todaySummary.total ? t('dash.recording') : t('dash.waiting')}</span>
        </div>
        <div class="report-grid">
          ${this.reportMetric('book-open', todaySummary.words, t('dash.newWords'), 'vocabulary')}
          ${this.reportMetric('quote', todaySummary.phrases, t('dash.savedPhrases'), 'phrases')}
          ${this.reportMetric('brain', todaySummary.reviews, t('dash.reviews'), 'vocabulary')}
          ${this.reportMetric('newspaper', todaySummary.articles, t('dash.articles'), 'article')}
        </div>
        <p class="report-note">${this.summarySentence(todaySummary)}</p>
      </section>

      <section class="learning-history">
        <div class="section-heading">
          <div>
            <span class="section-kicker">LEARNING LOG</span>
            <h2>${t('dash.recent')}</h2>
          </div>
          <span class="history-total">${t('dash.totalWords', { count: stats.total })}</span>
        </div>
        <div class="history-list">
          ${recentRecords.map(record => `
            <div class="history-entry ${this.expandedDate === record.date ? 'is-expanded' : ''}">
              <button class="history-day ${record.isToday ? 'is-today' : ''}" data-history-date="${record.date}">
                <span class="history-date">
                  <strong>${record.day}</strong>
                  <span>${record.weekday}</span>
                </span>
                <span class="history-bar">
                  <span style="width:${Math.max(record.total ? 12 : 0, Math.min(100, record.total * 14))}%"></span>
                </span>
                <span class="history-result">
                  <strong>${record.total}</strong>
                  <span>${t('dash.activities', { count: record.total }).replace(String(record.total), '').trim()}</span>
                </span>
                <span class="history-check ${record.checkedIn ? 'is-checked' : ''}">
                  <i data-lucide="${record.checkedIn ? 'check-circle-2' : 'circle'}"></i>
                </span>
                <i class="history-chevron" data-lucide="chevron-down"></i>
              </button>
              ${this.expandedDate === record.date ? this.renderHistoryDetail(record) : ''}
            </div>
          `).join('')}
        </div>
      </section>
    `;

    document.getElementById('btn-checkin')?.addEventListener('click', () => {
      const nextCheckedIn = !todayRecord.checkedIn;
      Storage.saveLearningRecord(today, {
        ...todaySummary,
        checkedIn: nextCheckedIn,
        checkedInAt: todayRecord.checkedIn ? null : new Date().toISOString()
      });
      Analytics.event('daily_check_in', { status: nextCheckedIn ? 'checked' : 'unchecked' });
      this.render();
    });

    document.getElementById('btn-go-review')?.addEventListener('click', () => {
      if (due.length && window.Vocabulary) {
        Vocabulary.startReview();
        return;
      }
      window.location.hash = 'vocabulary';
    });

    main.querySelectorAll('[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        window.location.hash = button.dataset.view;
      });
    });

    main.querySelectorAll('[data-history-date]').forEach(button => {
      button.addEventListener('click', () => {
        this.expandedDate = this.expandedDate === button.dataset.historyDate
          ? null
          : button.dataset.historyDate;
        this.render();
      });
    });

    if (window.lucide) lucide.createIcons();
  },

  reportMetric(icon, value, label, view) {
    return `
      <button class="report-metric" data-view="${view}">
        <span class="report-metric-icon"><i data-lucide="${icon}"></i></span>
        <span>
          <strong>${value}</strong>
          <small>${label}</small>
        </span>
      </button>
    `;
  },

  buildSummary(date, words, phrases, articles) {
    const dateKey = Storage.toDateKey(date);
    const isDate = value => Storage.toDateKey(value) === dateKey;
    const reviews = words.reduce((count, word) => {
      const history = Array.isArray(word.history) ? word.history : [];
      return count + history.filter(item => isDate(item.date)).length;
    }, 0);
    const summary = {
      words: words.filter(item => isDate(item.created)).length,
      phrases: phrases.filter(item => isDate(item.created)).length,
      articles: articles.filter(item => isDate(item.created || item.createdAt || item.date)).length,
      reviews
    };
    summary.total = summary.words + summary.phrases + summary.articles + summary.reviews;
    return summary;
  },

  buildRecentRecords(days, words, phrases, articles) {
    return Array.from({ length: days }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - index);
      const summary = this.buildSummary(date, words, phrases, articles);
      const stored = Storage.getLearningRecord(date);
      const details = this.buildDayDetails(date, words, phrases, articles);
      if (summary.total || stored) {
        Storage.saveLearningRecord(date, {
          ...summary,
          checkedIn: stored?.checkedIn || false
        });
      }
      return {
        ...summary,
        date: Storage.toDateKey(date),
        details,
        checkedIn: stored?.checkedIn || false,
        checkedInAt: stored?.checkedInAt || null,
        day: I18n.date(date, { month: '2-digit', day: '2-digit' }),
        weekday: index === 0 ? t('dash.today') : t(`weekday.${date.getDay()}`),
        isToday: index === 0
      };
    });
  },

  buildDayDetails(date, words, phrases, articles) {
    const dateKey = Storage.toDateKey(date);
    const isDate = value => Storage.toDateKey(value) === dateKey;
    const details = [];

    words.filter(item => isDate(item.created)).forEach(item => {
      details.push({
        type: t('dash.addedWord'),
        icon: 'book-open',
        title: item.word,
        detail: item.meaningZh || item.meaningJp || item.reading || t('dash.addedLibrary'),
        time: item.created
      });
    });

    phrases.filter(item => isDate(item.created)).forEach(item => {
      details.push({
        type: t('dash.addedPhrase'),
        icon: 'quote',
        title: item.japanese,
        detail: item.chinese || item.reading || t('dash.addedPhrases'),
        time: item.created
      });
    });

    words.forEach(word => {
      const history = Array.isArray(word.history) ? word.history : [];
      history.filter(item => isDate(item.date)).forEach(item => {
        const result = item.result === true ? t('dash.mastered') : item.result === 'medium' ? t('dash.difficult') : t('dash.relearn');
        details.push({
          type: t('dash.wordReview'),
          icon: 'brain',
          title: word.word,
          detail: `${result}${word.reading ? ` · ${word.reading}` : ''}`,
          time: item.date
        });
      });
    });

    articles.filter(item => isDate(item.created || item.createdAt || item.date)).forEach(item => {
      details.push({
        type: t('dash.readArticle'),
        icon: 'newspaper',
        title: item.title || item.titleJp || t('dash.japaneseArticle'),
        detail: item.summary || item.source || t('dash.readDone'),
        time: item.created || item.createdAt || item.date
      });
    });

    return details.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
  },

  renderHistoryDetail(record) {
    const checkinText = record.checkedIn
      ? `${t('dash.checkedAt')}${record.checkedInAt ? ` · ${this.formatTime(record.checkedInAt)}` : ''}`
      : t('dash.notChecked');
    return `
      <div class="history-detail">
        <div class="history-detail-header">
          <strong>${record.day} ${t('dash.log')}</strong>
          <span class="${record.checkedIn ? 'is-checked' : ''}">${checkinText}</span>
        </div>
        ${record.details.length ? `
          <div class="history-detail-list">
            ${record.details.map(item => `
              <div class="history-detail-item">
                <span class="history-detail-icon"><i data-lucide="${item.icon}"></i></span>
                <span class="history-detail-copy">
                  <small>${item.type}${item.time ? ` · ${this.formatTime(item.time)}` : ''}</small>
                  <strong>${this.escapeHtml(item.title)}</strong>
                  <span>${this.escapeHtml(item.detail)}</span>
                </span>
              </div>
            `).join('')}
          </div>
        ` : `<p class="history-detail-empty">${t('dash.detailEmpty')}</p>`}
      </div>
    `;
  },

  formatTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return I18n.time(date, { hour: '2-digit', minute: '2-digit' });
  },

  getFocusItems(date, words, phrases, articles) {
    const dateKey = Storage.toDateKey(date);
    const isDate = value => Storage.toDateKey(value) === dateKey;
    const items = [
      ...words.filter(item => isDate(item.created)).map(item => ({
        type: t('nav.words'),
        title: item.word,
        detail: item.meaningZh || item.meaningJp || item.reading || t('dash.addedLibrary')
      })),
      ...phrases.filter(item => isDate(item.created)).map(item => ({
        type: t('nav.phrases'),
        title: item.japanese,
        detail: item.chinese || item.reading || t('dash.addedPhrases')
      })),
      ...articles.filter(item => isDate(item.created || item.createdAt || item.date)).map(item => ({
        type: t('nav.news'),
        title: item.title || item.titleJp || t('dash.japaneseArticle'),
        detail: item.summary || item.source || t('dash.readDone')
      }))
    ];
    return items.slice(-3).reverse();
  },

  summarySentence(summary, yesterday = false) {
    if (!summary.total) {
      return yesterday
        ? t('dash.noYesterday')
        : t('dash.noToday');
    }
    const parts = [];
    if (summary.words) parts.push(`${t('dash.newWords')} ${summary.words}`);
    if (summary.phrases) parts.push(`${t('dash.savedPhrases')} ${summary.phrases}`);
    if (summary.reviews) parts.push(`${t('dash.reviews')} ${summary.reviews}`);
    if (summary.articles) parts.push(`${t('dash.articles')} ${summary.articles}`);
    return parts.join(' · ');
  },

  getGreeting() {
    const hour = new Date().getHours();
    if (hour < 11) return t('dash.morning');
    if (hour < 18) return t('dash.afternoon');
    return t('dash.evening');
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};

window.Dashboard = Dashboard;
