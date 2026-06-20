/**
 * Local storage adapter for Tsumori.
 *
 * All app data is stored under the "tsumori_" prefix so it can be exported,
 * imported, or moved to a remote backend later.
 */

const Storage = {
  PREFIX: 'tsumori_',
  cloudSyncTimer: null,
  accountSyncTimer: null,
  hydratingCloud: false,
  USER_SCOPED_KEYS: new Set([
    'vocabulary',
    'phrases',
    'articles',
    'expert_queries',
    'learning_records'
  ]),

  init() {
    if (!this.get('_initialized')) {
      this.set('_initialized', 'true');
    }

    const config = this.getConfig();
    if (!Array.isArray(config.users)) config.users = [];
    if (config.users.length === 0 && this.hasLegacyData()) {
      const user = {
        id: 'user_default',
        name: 'Default User',
        profile: { language: 'zh', industry: 'none', level: 'n3' },
        settings: { autoAddToVocab: false, showExamples: true, showGrammar: true, maxExamples: 3 }
      };
      config.users.push(user);
      config.currentUserId = user.id;
    }
    if (!config.currentUserId && config.users.length) config.currentUserId = config.users[0].id;
    if (!config.theme) config.theme = 'light';
    if (!config.ai) {
      config.ai = {
        activeProvider: 'gemini',
        providers: {
          gemini: {
            apiKey: config.apiKey || '',
            model: 'gemini-2.5-flash'
          },
          openai: {
            apiKey: '',
            model: 'gpt-5.4-mini'
          },
          deepseek: {
            apiKey: '',
            model: 'deepseek-v4-flash'
          }
        }
      };
    }
    config.ai.providers = config.ai.providers || {};
    config.ai.providers.gemini = {
      apiKey: config.ai.providers.gemini?.apiKey || config.apiKey || '',
      model: config.ai.providers.gemini?.model || 'gemini-2.5-flash'
    };
    config.ai.providers.openai = {
      apiKey: config.ai.providers.openai?.apiKey || '',
      model: config.ai.providers.openai?.model || 'gpt-5.4-mini'
    };
    config.ai.providers.deepseek = {
      apiKey: config.ai.providers.deepseek?.apiKey || '',
      model: config.ai.providers.deepseek?.model || 'deepseek-v4-flash'
    };
    if (!['gemini', 'openai', 'deepseek'].includes(config.ai.activeProvider)) {
      config.ai.activeProvider = 'gemini';
    }
    delete config.apiKey;
    this.set('_config', JSON.stringify(config));
  },

  _key(key) {
    return this.PREFIX + key;
  },

  _parse(value, fallback) {
    if (value == null || value === '') return fallback;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  },

  get(key) {
    return localStorage.getItem(this._key(key));
  },

  set(key, value) {
    localStorage.setItem(this._key(key), String(value));
  },

  removeKey(key) {
    localStorage.removeItem(this._key(key));
  },

  getAll(key) {
    const items = this._parse(this.get(key), []);
    if (!this.USER_SCOPED_KEYS.has(key)) return items;
    const userId = this._getCurrentUserId();
    if (!userId) return [];
    return items.filter(item => item.userId === userId);
  },

  saveAll(key, items) {
    if (!this.USER_SCOPED_KEYS.has(key)) {
      this.set(key, JSON.stringify(items));
      return;
    }
    const userId = this._getCurrentUserId();
    if (!userId) return;
    const all = this._parse(this.get(key), []);
    const otherUsers = all.filter(item => item.userId !== userId);
    const currentItems = (items || []).map(item => ({ ...item, userId }));
    this.set(key, JSON.stringify([...otherUsers, ...currentItems]));
    this.scheduleCloudSync();
  },

  add(key, item) {
    if (key === 'vocabulary') return this.upsertVocabulary(item);
    const items = this.getAll(key);
    const next = { ...item };
    if (!next.id) {
      next.id = key + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    }
    if (this.USER_SCOPED_KEYS.has(key)) next.userId = this._getCurrentUserId();
    items.push(next);
    this.saveAll(key, items);
    return next;
  },

  update(key, id, data) {
    if (key === 'vocabulary') return this.upsertVocabulary(data, id);
    const items = this.getAll(key);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;
    items[index] = { ...items[index], ...data };
    this.saveAll(key, items);
    return items[index];
  },

  normalizeVocabularyTerm(value) {
    return String(value || '')
      .normalize('NFKC')
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, '');
  },

  upsertVocabulary(data, id = null) {
    const items = this.getAll('vocabulary');
    const currentIndex = id ? items.findIndex(item => item.id === id) : -1;
    const current = currentIndex >= 0 ? items[currentIndex] : null;
    const candidate = { ...(current || {}), ...(data || {}) };
    const normalized = this.normalizeVocabularyTerm(candidate.word);
    if (!normalized) return current;

    const duplicateIndex = items.findIndex((item, index) =>
      index !== currentIndex &&
      this.normalizeVocabularyTerm(item.word) === normalized
    );

    if (duplicateIndex >= 0) {
      const duplicate = items[duplicateIndex];
      const merged = this.mergeVocabularyItems(duplicate, candidate);
      items[duplicateIndex] = merged;
      if (currentIndex >= 0) items.splice(currentIndex, 1);
      this.saveAll('vocabulary', items);
      if (current?.id && current.id !== merged.id) {
        this.rewireVocabularyReferences([current.id], merged.id);
      }
      return merged;
    }

    if (currentIndex >= 0) {
      items[currentIndex] = candidate;
      this.saveAll('vocabulary', items);
      return candidate;
    }

    const next = {
      ...candidate,
      id: candidate.id || 'vocabulary_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      userId: this._getCurrentUserId()
    };
    items.push(next);
    this.saveAll('vocabulary', items);
    return next;
  },

  consolidateVocabulary() {
    const items = this.getAll('vocabulary');
    const mergedItems = [];
    const indexes = new Map();
    const removedIds = new Map();

    items.forEach(item => {
      const normalized = this.normalizeVocabularyTerm(item.word);
      if (!normalized || !indexes.has(normalized)) {
        indexes.set(normalized, mergedItems.length);
        mergedItems.push(item);
        return;
      }
      const index = indexes.get(normalized);
      const kept = mergedItems[index];
      mergedItems[index] = this.mergeVocabularyItems(kept, item);
      if (item.id && item.id !== kept.id) removedIds.set(item.id, kept.id);
    });

    if (!removedIds.size) return { merged: 0, items };
    this.saveAll('vocabulary', mergedItems);
    removedIds.forEach((keptId, removedId) => {
      this.rewireVocabularyReferences([removedId], keptId);
    });
    return { merged: removedIds.size, items: mergedItems };
  },

  mergeVocabularyItems(primary, incoming) {
    const primaryScore = this.vocabularyProgressScore(primary);
    const incomingScore = this.vocabularyProgressScore(incoming);
    const progress = incomingScore > primaryScore ? incoming : primary;
    const readings = [primary.reading, incoming.reading].filter(Boolean);
    const mergedReading = this.betterVocabularyText(primary.reading, incoming.reading);
    const aliases = [
      ...(Array.isArray(primary.aliases) ? primary.aliases : []),
      ...(Array.isArray(incoming.aliases) ? incoming.aliases : []),
      ...readings.slice(1)
    ];
    const history = [...(Array.isArray(primary.history) ? primary.history : [])];
    (Array.isArray(incoming.history) ? incoming.history : []).forEach(entry => {
      const signature = JSON.stringify([entry.date, entry.result, entry.response]);
      if (!history.some(existing => JSON.stringify([existing.date, existing.result, existing.response]) === signature)) {
        history.push(entry);
      }
    });
    history.sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));

    return {
      ...primary,
      ...progress,
      id: primary.id,
      userId: primary.userId || incoming.userId || this._getCurrentUserId(),
      word: this.betterVocabularyText(primary.word, incoming.word),
      reading: mergedReading,
      meaningJp: this.betterVocabularyText(primary.meaningJp, incoming.meaningJp),
      meaningZh: this.betterVocabularyText(primary.meaningZh, incoming.meaningZh),
      aliases: [...new Set(aliases.map(value => String(value).trim()).filter(value =>
        value && this.normalizeVocabularyTerm(value) !== this.normalizeVocabularyTerm(mergedReading)
      ))],
      history,
      mastery: Math.max(Number(primary.mastery || 0), Number(incoming.mastery || 0)),
      repetitions: Math.max(Number(primary.repetitions || 0), Number(incoming.repetitions || 0)),
      lapses: Math.max(Number(primary.lapses || 0), Number(incoming.lapses || 0)),
      created: this.earlierDate(primary.created, incoming.created),
      updatedAt: new Date().toISOString(),
      expertQueryIds: [...new Set([
        ...(Array.isArray(primary.expertQueryIds) ? primary.expertQueryIds : []),
        ...(Array.isArray(incoming.expertQueryIds) ? incoming.expertQueryIds : []),
        primary.expertQueryId,
        incoming.expertQueryId
      ].filter(Boolean))]
    };
  },

  vocabularyProgressScore(item) {
    return Number(item?.mastery || 0) * 1000 +
      Number(item?.repetitions || 0) * 100 +
      (Array.isArray(item?.history) ? item.history.length : 0);
  },

  betterVocabularyText(first, second) {
    const a = String(first || '').trim();
    const b = String(second || '').trim();
    if (!a) return b;
    if (!b) return a;
    return b.length > a.length ? b : a;
  },

  earlierDate(first, second) {
    if (!first) return second;
    if (!second) return first;
    return new Date(first) <= new Date(second) ? first : second;
  },

  rewireVocabularyReferences(removedIds, keptId) {
    const removed = new Set(removedIds.filter(Boolean));
    if (!removed.size || !keptId) return;
    const queries = this.getAll('expert_queries');
    let changed = false;
    queries.forEach(query => {
      if (removed.has(query.linkedWordId)) {
        query.linkedWordId = keptId;
        query.addedToVocab = true;
        changed = true;
      }
    });
    if (changed) this.saveAll('expert_queries', queries);
  },

  remove(key, id) {
    this.saveAll(key, this.getAll(key).filter(item => item.id !== id));
  },

  getById(key, id) {
    return this.getAll(key).find(item => item.id === id) || null;
  },

  count(key) {
    return this.getAll(key).length;
  },

  getDueItems(key) {
    const now = new Date();
    return this.getAll(key).filter(item => !item.nextReview || new Date(item.nextReview) <= now);
  },

  getTodayItems(key) {
    const today = new Date().toDateString();
    return this.getAll(key).filter(item => item.created && new Date(item.created).toDateString() === today);
  },

  toDateKey(value = new Date()) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  getLearningRecords() {
    return this.getAll('learning_records');
  },

  getLearningRecord(date = new Date()) {
    const dateKey = this.toDateKey(date);
    return this.getLearningRecords().find(item => item.date === dateKey) || null;
  },

  saveLearningRecord(date, data) {
    const dateKey = this.toDateKey(date);
    const records = this.getLearningRecords();
    const index = records.findIndex(item => item.date === dateKey);
    const previous = index >= 0 ? records[index] : {};
    const record = {
      ...previous,
      ...data,
      id: previous.id || `learning_${dateKey}`,
      date: dateKey,
      updatedAt: new Date().toISOString()
    };
    if (index >= 0) records[index] = record;
    else records.push(record);
    records.sort((a, b) => b.date.localeCompare(a.date));
    this.saveAll('learning_records', records);
    return record;
  },

  export() {
    const config = this.getConfig();
    const user = config.users.find(item => item.id === config.currentUserId);
    const safeUser = user ? { ...user } : null;
    if (safeUser) {
      delete safeUser.passwordHash;
      delete safeUser.passwordSalt;
      delete safeUser.passwordIterations;
    }
    const data = { version: 2, exportedAt: new Date().toISOString(), user: safeUser, collections: {} };
    this.USER_SCOPED_KEYS.forEach(key => {
      data.collections[key] = this.getAll(key);
    });
    return data;
  },

  import(data) {
    if (data?.version === 2 && data.collections) {
      Object.entries(data.collections).forEach(([key, items]) => {
        if (this.USER_SCOPED_KEYS.has(key) && Array.isArray(items)) this.saveAll(key, items);
      });
      this.scheduleCloudSync();
      return;
    }
    Object.entries(data || {}).forEach(([key, value]) => {
      if (!this.USER_SCOPED_KEYS.has(key)) return;
      const items = typeof value === 'string' ? this._parse(value, []) : value;
      if (Array.isArray(items)) this.saveAll(key, items);
    });
  },

  getConfig() {
    return this._parse(this.get('_config'), { users: [], currentUserId: null, theme: 'light' });
  },

  saveConfig(config) {
    this.set('_config', JSON.stringify(config));
  },

  _getCurrentUserId() {
    return this.getConfig().currentUserId;
  },

  currentUser() {
    const config = this.getConfig();
    return config.users.find(user => user.id === config.currentUserId) || null;
  },

  storageMode() {
    return this.currentUser()?.storageMode === 'cloud' ? 'cloud' : 'local';
  },

  clearCurrentUserData(userId = this._getCurrentUserId()) {
    if (!userId) return;
    this.USER_SCOPED_KEYS.forEach(key => {
      const items = this._parse(this.get(key), []);
      this.set(key, JSON.stringify(items.filter(item => item.userId !== userId)));
    });
    const config = this.getConfig();
    config.users = config.users.filter(user => user.id !== userId);
    if (config.currentUserId === userId) config.currentUserId = null;
    this.saveConfig(config);
  },

  clearAllLocalData() {
    Object.keys(localStorage)
      .filter(key => key.startsWith(this.PREFIX))
      .forEach(key => localStorage.removeItem(key));
  },

  setCurrentAccount(user) {
    if (!user?.id) return null;
    const config = this.getConfig();
    const legacy = config.users.find(item => item.email === user.email && item.id !== user.id);
    const existing = config.users.findIndex(item => item.id === user.id);
    const localSettings = existing >= 0 ? config.users[existing] : legacy;
    const merged = {
      ...(localSettings || {}),
      ...user,
      profile: { ...(localSettings?.profile || {}), ...(user.profile || {}) },
      settings: { ...(localSettings?.settings || {}), ...(user.settings || {}) }
    };
    delete merged.passwordHash;
    delete merged.passwordSalt;
    delete merged.passwordIterations;
    if (existing >= 0) config.users[existing] = merged;
    else config.users.push(merged);
    config.users = config.users.filter(item => item.id === user.id || item.email !== user.email);
    config.currentUserId = user.id;
    this.saveConfig(config);
    if (legacy) this.migrateUserData(legacy.id, user.id);
    this.assignUnownedData(user.id);
    return merged;
  },

  migrateUserData(oldUserId, newUserId) {
    if (!oldUserId || !newUserId || oldUserId === newUserId) return;
    this.USER_SCOPED_KEYS.forEach(key => {
      const items = this._parse(this.get(key), []);
      let changed = false;
      items.forEach(item => {
        if (item.userId === oldUserId) {
          item.userId = newUserId;
          changed = true;
        }
      });
      if (changed) this.set(key, JSON.stringify(items));
    });
  },

  getCurrentCollections() {
    const collections = {};
    this.USER_SCOPED_KEYS.forEach(key => {
      collections[key] = this.getAll(key);
    });
    return collections;
  },

  hydrateCloud(collections) {
    this.hydratingCloud = true;
    try {
      this.USER_SCOPED_KEYS.forEach(key => {
        this.saveAll(key, Array.isArray(collections?.[key]) ? collections[key] : []);
      });
    } finally {
      this.hydratingCloud = false;
    }
  },

  scheduleCloudSync() {
    if (this.hydratingCloud || this.storageMode() !== 'cloud' || !window.Auth?.hasSession()) return;
    clearTimeout(this.cloudSyncTimer);
    this.cloudSyncTimer = setTimeout(() => {
      Auth.saveCloudData(this.getCurrentCollections()).catch(error => {
        console.warn('Cloud sync failed:', error.message);
      });
    }, 400);
  },

  scheduleAccountSync() {
    if (!window.Auth?.hasSession()) return;
    clearTimeout(this.accountSyncTimer);
    this.accountSyncTimer = setTimeout(() => {
      const user = this.currentUser();
      if (!user) return;
      Auth.updateAccount({
        name: user.name,
        uiLanguage: user.uiLanguage,
        storageMode: user.storageMode,
        profile: user.profile,
        settings: user.settings
      }).catch(error => console.warn('Account sync failed:', error.message));
    }, 300);
  },

  hasLegacyData() {
    return [...this.USER_SCOPED_KEYS].some(key => this._parse(this.get(key), []).length > 0);
  },

  assignUnownedData(userId) {
    this.USER_SCOPED_KEYS.forEach(key => {
      const items = this._parse(this.get(key), []);
      let changed = false;
      items.forEach(item => {
        if (!item.userId) {
          item.userId = userId;
          changed = true;
        }
      });
      if (changed) this.set(key, JSON.stringify(items));
    });
  },

  addUser(name) {
    const config = this.getConfig();
    const user = {
      id: 'user_' + Date.now(),
      name,
      profile: { language: 'zh', industry: 'none', level: 'n3' },
      settings: { autoAddToVocab: false, showExamples: true, showGrammar: true, maxExamples: 3 }
    };
    config.users.push(user);
    config.currentUserId = user.id;
    this.saveConfig(config);
    return user;
  },

  switchUser(userId) {
    const config = this.getConfig();
    if (config.users.some(user => user.id === userId)) {
      config.currentUserId = userId;
      this.saveConfig(config);
      return true;
    }
    return false;
  },

  updateUserProfile(userId, data) {
    const config = this.getConfig();
    const index = config.users.findIndex(user => user.id === userId);
    if (index === -1) return null;
    const user = config.users[index];
    if (data.profile) user.profile = { ...(user.profile || {}), ...data.profile };
    if (data.settings) user.settings = { ...(user.settings || {}), ...data.settings };
    Object.keys(data).forEach(key => {
      if (key !== 'profile' && key !== 'settings') user[key] = data[key];
    });
    config.users[index] = user;
    this.saveConfig(config);
    this.scheduleAccountSync();
    return user;
  },

  getUserProfile(userId) {
    const user = this.getConfig().users.find(item => item.id === userId);
    return {
      profile: user?.profile || {},
      settings: user?.settings || {}
    };
  },

  addExpertQuery(data) {
    return this.add('expert_queries', {
      ...data,
      id: data.id || 'eq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8)
    });
  },

  getExpertQueries(userId) {
    const items = this.getAll('expert_queries');
    return userId ? items.filter(item => item.userId === userId) : items;
  },

  getExpertQuery(id) {
    return this.getById('expert_queries', id);
  },

  removeExpertQuery(id) {
    this.remove('expert_queries', id);
  },

  updateExpertQuery(id, data) {
    return this.update('expert_queries', id, data);
  },

  clearExpertQueries(userId) {
    const items = this.getAll('expert_queries');
    this.saveAll('expert_queries', userId ? items.filter(item => item.userId !== userId) : []);
  },

  linkToVocab(queryId, wordId) {
    this.updateExpertQuery(queryId, { linkedWordId: wordId, addedToVocab: true });
  }
};

Storage.init();
window.TsumoriStorage = Storage;
