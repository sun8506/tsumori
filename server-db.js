const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ServerDatabase {
  constructor(root) {
    this.dir = process.env.TSUMORI_DATA_DIR
      ? path.resolve(process.env.TSUMORI_DATA_DIR)
      : path.join(root, 'data');
    this.file = path.join(this.dir, 'tsumori-db.json');
    this.state = { version: 1, users: [], sessions: [], cloudData: {} };
    this.load();
  }

  load() {
    fs.mkdirSync(this.dir, { recursive: true });
    try {
      const parsed = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      this.state = {
        version: 1,
        users: Array.isArray(parsed.users) ? parsed.users : [],
        sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
        cloudData: parsed.cloudData && typeof parsed.cloudData === 'object' ? parsed.cloudData : {}
      };
    } catch {
      this.persist();
    }
    this.removeExpiredSessions();
  }

  persist() {
    const temporary = `${this.file}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(temporary, this.file);
  }

  removeExpiredSessions() {
    const now = Date.now();
    const before = this.state.sessions.length;
    this.state.sessions = this.state.sessions.filter(item => new Date(item.expiresAt).getTime() > now);
    if (before !== this.state.sessions.length) this.persist();
  }

  normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  hashPassword(password, salt = crypto.randomBytes(16).toString('base64')) {
    const hash = crypto.scryptSync(String(password), salt, 64).toString('base64');
    return { hash, salt };
  }

  publicUser(user) {
    if (!user) return null;
    const { passwordHash, passwordSalt, ...safe } = user;
    return safe;
  }

  createUser(input) {
    const email = this.normalizeEmail(input.email);
    if (this.state.users.some(user => user.email === email)) {
      const error = new Error('EMAIL_EXISTS');
      error.status = 409;
      throw error;
    }
    const password = this.hashPassword(input.password);
    const user = {
      id: `usr_${crypto.randomUUID()}`,
      email,
      name: String(input.name || '').trim(),
      passwordHash: password.hash,
      passwordSalt: password.salt,
      storageMode: input.storageMode === 'cloud' ? 'cloud' : 'local',
      uiLanguage: input.uiLanguage || 'zh',
      profile: input.profile || { language: 'zh', industry: 'none', level: 'n3' },
      settings: input.settings || { autoAddToVocab: false, maxExamples: 3 },
      privacyVersion: input.privacyVersion,
      privacyConsentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.state.users.push(user);
    this.state.cloudData[user.id] = {};
    this.persist();
    return this.publicUser(user);
  }

  authenticate(emailValue, password) {
    const email = this.normalizeEmail(emailValue);
    const user = this.state.users.find(item => item.email === email);
    if (!user) return null;
    const result = this.hashPassword(password, user.passwordSalt);
    if (!crypto.timingSafeEqual(Buffer.from(result.hash), Buffer.from(user.passwordHash))) return null;
    return this.publicUser(user);
  }

  createSession(userId) {
    this.removeExpiredSessions();
    const token = crypto.randomBytes(32).toString('base64url');
    const session = {
      id: crypto.randomUUID(),
      userId,
      tokenHash: crypto.createHash('sha256').update(token).digest('hex'),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };
    this.state.sessions.push(session);
    this.persist();
    return { token, expiresAt: session.expiresAt };
  }

  getUserByToken(token) {
    if (!token) return null;
    this.removeExpiredSessions();
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = this.state.sessions.find(item => item.tokenHash === tokenHash);
    if (!session) return null;
    return this.publicUser(this.state.users.find(user => user.id === session.userId));
  }

  deleteSession(token) {
    const tokenHash = crypto.createHash('sha256').update(String(token || '')).digest('hex');
    this.state.sessions = this.state.sessions.filter(item => item.tokenHash !== tokenHash);
    this.persist();
  }

  updateUser(userId, changes) {
    const user = this.state.users.find(item => item.id === userId);
    if (!user) return null;
    if (changes.name != null) user.name = String(changes.name).trim();
    if (changes.uiLanguage != null) user.uiLanguage = changes.uiLanguage;
    if (changes.storageMode != null) user.storageMode = changes.storageMode === 'cloud' ? 'cloud' : 'local';
    if (changes.profile) user.profile = { ...(user.profile || {}), ...changes.profile };
    if (changes.settings) user.settings = { ...(user.settings || {}), ...changes.settings };
    user.updatedAt = new Date().toISOString();
    this.persist();
    return this.publicUser(user);
  }

  getCloudData(userId) {
    return this.state.cloudData[userId] || {};
  }

  setCloudData(userId, collections) {
    this.state.cloudData[userId] = collections && typeof collections === 'object' ? collections : {};
    this.persist();
    return this.state.cloudData[userId];
  }
}

module.exports = ServerDatabase;
