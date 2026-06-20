const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const storage = new Map();
const context = {
  console,
  localStorage: {
    getItem: key => storage.get(key) || null,
    setItem: (key, value) => storage.set(key, String(value))
  }
};
context.window = context;
vm.createContext(context);

for (const file of ['js/i18n.js', 'js/i18n-pages.js', 'js/i18n-storage.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
}

const i18n = context.I18n;
assert.deepEqual([...i18n.supported], ['zh', 'en', 'ja', 'ko', 'vi', 'my']);

const sourceFiles = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    if (entry.isFile() && entry.name.endsWith('.js')) sourceFiles.push(fullPath);
  }
}
collect(path.join(root, 'js'));

const usedKeys = new Set();
for (const file of sourceFiles) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) usedKeys.add(match[1]);
  for (const match of source.matchAll(/data-i18n(?:-title)?=["']([^"']+)["']/g)) usedKeys.add(match[1]);
}

const missing = [];
for (const language of i18n.supported) {
  for (const key of usedKeys) {
    if (!Object.prototype.hasOwnProperty.call(i18n.messages[language], key)) {
      missing.push(`${language}:${key}`);
    }
  }
}

assert.deepEqual(missing, [], `Missing translations:\n${missing.join('\n')}`);
console.log(`Translation coverage passed for ${usedKeys.size} static keys in 6 languages.`);
