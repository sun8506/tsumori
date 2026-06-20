const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const context = { window: {} };
vm.createContext(context);
vm.runInContext(
  `${fs.readFileSync(path.join(root, 'js/public-content.js'), 'utf8')}\nthis.__content = PublicContent;`,
  context,
  { filename: 'js/public-content.js' }
);

const content = context.__content;
assert.ok(content.items.length >= 14);
assert.equal(new Set(content.items.map(item => item.id)).size, content.items.length);
assert.deepEqual(
  [...new Set(content.items.map(item => item.type))].sort(),
  ['industry', 'phrase', 'reading', 'word']
);
assert.deepEqual(
  [...new Set(content.items.map(item => item.level))].sort(),
  ['BEGINNER', 'N1', 'N2', 'N3', 'N4', 'N5']
);
assert.deepEqual(
  [...new Set(content.items.map(item => item.industry))].sort(),
  ['education', 'food', 'general', 'hospitality', 'it', 'manufacturing', 'realestate', 'sales', 'service']
);

const industries = ['education', 'food', 'hospitality', 'it', 'manufacturing', 'realestate', 'sales', 'service'];
for (const industry of industries) {
  const industryItems = content.items.filter(item => item.industry === industry);
  assert.ok(industryItems.length >= 2, `${industry} needs at least two lessons`);
  assert.ok(industryItems.some(item =>
    item.type === 'phrase' &&
    item.tags?.includes('common') &&
    item.tags?.includes('keigo') &&
    item.scene
  ), `${industry} needs a common phrase and keigo lesson`);
}

for (const item of content.items) {
  assert.ok(item.title);
  assert.ok(item.summary);
  assert.ok(item.level);
  assert.ok(item.industry);
  assert.ok(item.minutes > 0);
  assert.ok(item.paragraphs.length >= 3);
  assert.ok(item.translation);
  assert.ok(item.vocab.length >= 3);
  assert.ok(item.phrases.length >= 2);
  if (item.tags) assert.ok(Array.isArray(item.tags));
  assert.equal(content.get(item.id).id, item.id);
}

console.log(`Public library content test passed for ${content.items.length} lessons.`);
