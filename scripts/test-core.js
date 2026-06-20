const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ServerDatabase = require('../server-db');

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'tsumori-test-'));
const database = new ServerDatabase(directory);

try {
  const user = database.createUser({
    name: 'Test User',
    email: 'test@example.com',
    password: 'password1',
    storageMode: 'cloud',
    uiLanguage: 'ja',
    privacyVersion: 'test'
  });
  const session = database.createSession(user.id);
  database.setCloudData(user.id, { vocabulary: [{ id: 'word-1' }] });

  assert.equal(database.getUserByToken(session.token).id, user.id);
  assert.equal(database.getCloudData(user.id).vocabulary.length, 1);
  assert.equal(database.deleteUser(user.id), true);
  assert.equal(database.getUserByToken(session.token), null);
  assert.deepEqual(database.getCloudData(user.id), {});
  console.log('Core account lifecycle test passed.');
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
