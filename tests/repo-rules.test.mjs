// Enforces the rules in CONTRIBUTING.md so they cannot quietly slip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const SKIP_DIRS = ['.git', 'node_modules', '_site'];
const MAX_LINE = 120;
const MAX_FILE_BYTES = 500 * 1024;
const CODE_FILE = /\.(js|mjs|html|css|yml|json)$/;

function allFiles() {
  return readdirSync(root, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(root.length).replaceAll('\\', '/'))
    .filter((name) => !SKIP_DIRS.some((dir) => name === dir || name.startsWith(`${dir}/`)))
    .filter((name) => !name.includes('/node_modules/') && !name.endsWith('.DS_Store'));
}

const files = allFiles();
const ours = files.filter((name) => !name.startsWith('site/vendor/'));
const gameModules = files.filter((name) => name.startsWith('site/js/game/') && name.endsWith('.js'));

test(`code lines stay under ${MAX_LINE} characters`, () => {
  const tooLong = [];
  for (const name of ours.filter((file) => CODE_FILE.test(file))) {
    readFileSync(join(root, name), 'utf8').split('\n').forEach((line, index) => {
      if (line.length >= MAX_LINE) tooLong.push(`${name}:${index + 1} (${line.length} chars)`);
    });
  }
  assert.deepEqual(tooLong, []);
});

test('no large files in the repo (vendored Three.js is the one exception)', () => {
  const tooBig = ours
    .map((name) => [name, statSync(join(root, name)).size])
    .filter(([, size]) => size > MAX_FILE_BYTES)
    .map(([name, size]) => `${name} (${Math.round(size / 1024)} KB)`);
  assert.deepEqual(tooBig, []);
});

test('game logic never touches rendering or the browser', () => {
  const banned = [
    [/from\s+['"][^'"]*(vendor|render)\//, 'imports rendering code'],
    [/\b(document|window|navigator|requestAnimationFrame)\b/, 'uses a browser-only global'],
  ];
  const problems = [];
  for (const name of gameModules) {
    // Comments and plain text in quotes do not count: a portal can be of type 'window'.
    const code = readFileSync(join(root, name), 'utf8').replace(/\/\/.*$/gm, '').replace(/'[^'\n]*'/g, "''");
    for (const [pattern, why] of banned) if (pattern.test(code)) problems.push(`${name} ${why}`);
  }
  assert.deepEqual(problems, []);
});

test('every game logic module loads in Node', async () => {
  assert.ok(gameModules.length > 0);
  for (const name of gameModules) await import(pathToFileURL(join(root, name)));
});

test('pages load scripts and styles from this repo only, never a CDN', () => {
  const remote = [];
  for (const name of ours.filter((file) => file.endsWith('.html'))) {
    const html = readFileSync(join(root, name), 'utf8');
    if (/(src|href)="(https?:)?\/\//.test(html)) remote.push(name);
  }
  assert.deepEqual(remote, []);
});
