const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const targets = ['server.js', 'server-db.js'];

function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) collect(fullPath);
    if (entry.isFile() && entry.name.endsWith('.js')) {
      targets.push(path.relative(root, fullPath));
    }
  }
}

collect(path.join(root, 'js'));

for (const target of [...new Set(targets)].sort()) {
  execFileSync(process.execPath, ['--check', path.join(root, target)], { stdio: 'inherit' });
}

console.log(`Syntax check passed for ${new Set(targets).size} files.`);
