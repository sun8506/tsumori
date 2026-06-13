/**
 * NHK News Web Easy API 銈儵銈ゃ偄銉炽儓
 *
 * NHK 銇缈掕€呭悜銇戙儖銉ャ兗銈硅浜嬨倰鍙栧緱銉荤鐞嗐仚銈嬨€? */

const NHK = {
  BASE_URL: 'https://www.nhk.or.jp/nhknews/',
  EASY_URL: 'https://news.easyjs.nihongonomotomo.org',

  async fetchToday() {
    try {
      // Try the easy proxy first
      const res = await fetch(`${this.EASY_URL}/api/articles/today`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return this.normalizeArticle(data);
    } catch (e) {
      console.warn('NHK fetch failed, trying direct:', e.message);
      return this.fetchFallback();
    }
  },

  async fetchFallback() {
    // Simple fallback: return a demo article
    return {
      title: '銉嬨儱銉笺偣锛堛儑銉級',
      japanese: '浠婃棩銇亜銇勫ぉ姘椼仹銇欍伃銆傚銇嚭銇︺€佹暎姝┿倰銇椼伨銇涖倱銇嬨€傛柊銇椼亜鍗樿獮銈掕銇堛倠銇伅銆佸疅闅涖伄銉嬨儱銉笺偣銈掕銈€銇亴涓€鐣伄鍔规灉鐨勩仾鏂规硶銇с仚銆?,
      date: new Date().toISOString().split('T')[0],
      url: '',
      vocab: [
        { word: '澶╂皸', reading: '銇︺倱銇?, meaning: '澶╂皸' },
        { word: '鏁ｆ', reading: '銇曘倱銇?, meaning: '鏁ｆ' },
        { word: '鍔规灉鐨?, reading: '銇撱亞銇嬨仸銇?, meaning: '鍔规灉鐨? }
      ]
    };
  },

  normalizeArticle(data) {
    const items = Array.isArray(data) ? data : [data];
    return items.map(item => ({
      title: item.title || item.headline || '瑷樹簨',
      japanese: item.body || item.content || item.text || '',
      date: item.date || new Date().toISOString(),
      url: item.url || '',
      vocab: (item.vocab || []).map(v => ({
        word: v.word || '',
        reading: v.reading || '',
        meaning: v.meaning || ''
      }))
    }));
  },

  async fetchAndSaveToday() {
    const articles = await this.fetchToday();
    articles.forEach(article => {
      Storage.add('articles', {
        ...article,
        id: 'article_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
        translation: null
      });
    });
    return articles;
  }
};

window.NHK = NHK;