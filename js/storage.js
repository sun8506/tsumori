/**
 * Storage Layer 绐躲兓璎桨璎愶疆璎栤埥锝广兓鍠ц瑲锝介泿锝¤灮銉?* 
 * 璎嚶€璀涚敾鐒氳瑦锝毝锝块锝ň澶婏娇銉伙江锝よ瑮锝ヨ溈锝ｉ湋骞勶健寰屄€銉?* 锠栫仒鐕曡灣妯掗传鑽筹胶 localStorage銉绘ⅶ鎮磋瓪锝ヨ溈锝瓥锝胯瑦锝㈣嵆锝?storage-cloud.js銉汇兓upabase/Firebase銉诲敞聙銉?* 
 * 璎楋渐铚匡剑铻傞啀锝猴溅銉汇兓 *   init()           绐躲兓铔绘檹锝у彞鍠с兓浜ャ兓锜掞胶楫熷€╋疆锝ら€曪建璎岋椒閬蹭細锝笺兓 *   get(key)         绐躲兓闂旓椒铚块杸榛掕嵆锝洘锝? *   set(key, value)  绐躲兓鑿檹锝紲榛掕嵆锝洘锝? *   getAll(key)      绐躲兓闂旓椒铚垮寔鐒氭増銉伙郊浜曪交銉籎SON 锜勭ぜ锝溅鑽筹讲闅楋剑璀挵锝笺兓 *   add(key, item)   绐躲兓铚风鐒氭増銉伙娇锝借湁铮拌嵆聙楝橈焦
 *   update(key, id, data) 绐躲兓璀栵酱璀侊桨璎桨鎵堛兓锝革江璀熷锝★焦
 *   remove(key, id)  绐躲兓鑾夊彇鐒氭増銉诲敄楂饯鑽陈€楝橈焦
 *   count(key)       绐躲兓璎桨鎵堛兓锝★焦璎桨
 *   export()         绐躲兓锜囷郊铚冿胶铚堬建椹涳建璎桨璎愶疆
 *   import(data)     绐躲兓锜囷郊铚堬渐铚堬建椹涳建璎桨璎愶疆
 */

const Storage = {
  PREFIX: 'tsumori_',

  // 绗徛€绗徛€ 铔绘檹锝у彞鍠?绗徛€绗徛€
  init() {
    if (!this.get('_initialized')) {
      this.set('_initialized', true);
      this.set('_users', JSON.stringify([]));
      this.set('_currentUserId', null);
      this.set('_config', JSON.stringify({
        users: [],
        currentUserId: null,
        theme: 'light',
        dailyArticleTime: '09:00'
      }));
    }
  },

  // 绗徛€绗徛€ 铚€銉晃氳熅锝ヨ湀锝?绗徛€绗徛€
  _key(key) {
    return this.PREFIX + key;
  },

  _jsonParse(str, fallback) {
    if (!str) return fallback;
    try {
      return JSON.parse(str);
    } catch {
      return fallback;
    }
  },

  // 绗徛€绗徛€ 铦擄胶璀涳浆闅革交铚€銉荤瑥聙绗徛€
  get(key) {
    return localStorage.getItem(this._key(key));
  },

  set(key, value) {
    localStorage.setItem(this._key(key), value);
  },

  remove(key) {
    localStorage.removeItem(this._key(key));
  },

  // 绗徛€绗徛€ 铚婄﹤锝革姜锜囷焦闆庯健闅革交铚€鍛伙郊鍩熸綌 ID 閭忥舰锠戝寘锝笺兓绗徛€绗徛€
  getAll(key) {
    const raw = this.get(key);
    return this._jsonParse(raw, []);
  },

  add(key, item) {
    const items = this.getAll(key);
    if (!item.id) {
      item.id = key + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }
    items.push(item);
    this.set(key, JSON.stringify(items));
    return item;
  },

  update(key, id, data) {
    const items = this.getAll(key);
    const idx = items.findIndex(i => i.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data };
      this.set(key, JSON.stringify(items));
      return items[idx];
    }
    return null;
  },

  remove(key, id) {
    const items = this.getAll(key);
    const filtered = items.filter(i => i.id !== id);
    this.set(key, JSON.stringify(filtered));
  },

  getById(key, id) {
    return this.getAll(key).find(i => i.id === id);
  },

  count(key) {
    return this.getAll(key).length;
  },

  // 绗徛€绗徛€ 锜囷郊铚冿胶 / 锜囷郊铚堬渐 绗徛€绗徛€
  export() {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(this.PREFIX)) {
        const name = key.replace(this.PREFIX, '');
        data[name] = localStorage.getItem(key);
      }
    }
    return data;
  },

  import(data) {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_') || this.PREFIX + key) {
        localStorage.setItem(this._key(key), value);
      }
    }
  },

  // 绗徛€绗徛€ 楝€★胶锝ц瓱锝ラ毟锝?绗徛€绗徛€
  getDueItems(key) {
    const items = this.getAll(key);
    const now = new Date();
    return items.filter(item => {
      if (!item.nextReview) return true; // 璀涳姜铻熷牶锝癸０
      const next = new Date(item.nextReview);
      return next <= now;
    });
  },

  getTodayItems(key) {
    const today = new Date().toDateString();
    return this.getAll(key).filter(item => {
      return item.created && new Date(item.created).toDateString() === today;
    });
  }
};

// 闁撅姜铚夛建铔绘檹锝у彞鍠?Storage.init();

// 锜囷郊铚冿胶钀撳付锝健铦€滃枾鑿达娇閫曪建銉讳亥锝︺倛妫￠倗锝爡銉婚璎栥兓锝笺兓
  // 绗徛€绗徛€ Expert Queries CRUD 绗徛€绗徛€
  addExpertQuery(data) {
    const items = this.getAll('expert_queries');
    if (!data.id) {
      data.id = 'eq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }
    items.push(data);
    this.set('expert_queries', JSON.stringify(items));
    return data;
  },

  getExpertQueries(userId) {
    const items = this.getAll('expert_queries');
    return userId ? items.filter(q => q.userId === userId) : items;
  },

  getExpertQuery(id) {
    return this.getAll('expert_queries').find(q => q.id === id);
  },

  removeExpertQuery(id) {
    const items = this.getAll('expert_queries');
    const filtered = items.filter(q => q.id !== id);
    this.set('expert_queries', JSON.stringify(filtered));
  },

  updateExpertQuery(id, data) {
    const items = this.getAll('expert_queries');
    const idx = items.findIndex(q => q.id === id);
    if (idx !== -1) {
      items[idx] = { ...items[idx], ...data };
      this.set('expert_queries', JSON.stringify(items));
      return items[idx];
    }
    return null;
  },

  clearExpertQueries(userId) {
    const items = this.getAll('expert_queries');
    const filtered = userId ? items.filter(q => q.userId !== userId) : [];
    this.set('expert_queries', JSON.stringify(filtered));
  },

  linkToVocab(queryId, wordId) {
    this.updateExpertQuery(queryId, { linkedWordId: wordId, addedToVocab: true });
  },

  // 绗徛€绗徛€ User Profile Helpers 绗徛€绗徛€
  updateUserProfile(userId, profile) {
    const config = JSON.parse(this.get('_config') || '{}') || {};
    const users = config.users || [];
    const idx = users.findIndex(u => u.id === userId);
    if (idx !== -1) {
      users[idx].profile = { ...users[idx].profile, ...profile };
      if (profile.settings) users[idx].settings = { ...users[idx].settings, ...profile.settings };
      config.users = users;
      this.set('_config', JSON.stringify(config));
      return users[idx];
    }
    return null;
  },

  getUserProfile(userId) {
    const config = JSON.parse(this.get('_config') || '{}') || {};
    const users = config.users || [];
    const user = users.find(u => u.id === userId);
    return user ? { profile: user.profile || {}, settings: user.settings || {} } : { profile: {}, settings: {} };
  },

  getDefaultLanguage(userId) {
    const p = this.getUserProfile(userId);
    return p.profile.language || 'zh';
  },

  getIndustry(userId) {
    const p = this.getUserProfile(userId);
    return p.profile.industry || 'none';
  },

  getLevel(userId) {
    const p = this.getUserProfile(userId);
    return p.profile.level || 'n3';
  },
  // Helper: get current user ID from _config
  _getCurrentUserId() {
    const config = JSON.parse(this.get('_config') || '{}') || {};
    return config.currentUserId;
  },\nif (typeof window !== 'undefined') {
  window.TsumoriStorage = Storage;
}
