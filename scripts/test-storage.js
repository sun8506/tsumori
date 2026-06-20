const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const values = new Map();
const localStorage = {
  get length() {
    return values.size;
  },
  key(index) {
    return [...values.keys()][index] || null;
  },
  getItem(key) {
    return values.has(key) ? values.get(key) : null;
  },
  setItem(key, value) {
    values.set(key, String(value));
  },
  removeItem(key) {
    values.delete(key);
  }
};

const context = {
  console,
  localStorage,
  setTimeout,
  clearTimeout
};
context.window = context;
vm.createContext(context);

const source = fs.readFileSync(path.join(root, 'js/storage.js'), 'utf8');
vm.runInContext(`${source}\nthis.__Storage = Storage;`, context, { filename: 'js/storage.js' });
const storage = context.__Storage;
const user = storage.addUser('Storage Test');

storage.add('vocabulary', {
  word: '矛盾',
  reading: 'むじゅん',
  meaningJp: 'つじつまが合わないこと。',
  meaningZh: '矛盾，不一致',
  mastery: 2,
  repetitions: 1,
  history: [{ date: '2026-06-19T10:00:00.000Z', result: true, response: 'むじゅん' }]
});
const merged = storage.add('vocabulary', {
  word: '　矛盾　',
  reading: 'ムジュン',
  meaningZh: '矛盾',
  mastery: 0,
  history: []
});

assert.equal(storage.getAll('vocabulary').length, 1);
assert.equal(merged.word, '矛盾');
assert.equal(merged.meaningZh, '矛盾，不一致');
assert.equal(merged.mastery, 2);
assert.equal(merged.history.length, 1);
assert.ok(merged.aliases.includes('ムジュン'));

const legacy = [
  { id: 'word-a', userId: user.id, word: '確認', reading: 'かくにん', meaningZh: '确认', history: [] },
  { id: 'word-b', userId: user.id, word: ' 確認 ', meaningJp: '確かめること。', mastery: 3, history: [] }
];
localStorage.setItem('tsumori_vocabulary', JSON.stringify(legacy));
localStorage.setItem('tsumori_expert_queries', JSON.stringify([
  { id: 'query-1', userId: user.id, linkedWordId: 'word-b', addedToVocab: true }
]));

const result = storage.consolidateVocabulary();
const consolidated = storage.getAll('vocabulary');
assert.equal(result.merged, 1);
assert.equal(consolidated.length, 1);
assert.equal(consolidated[0].id, 'word-a');
assert.equal(consolidated[0].meaningJp, '確かめること。');
assert.equal(consolidated[0].mastery, 3);
assert.equal(storage.getAll('expert_queries')[0].linkedWordId, 'word-a');

console.log('Vocabulary deduplication and merge tests passed.');
