import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareRelease } from '../scripts/prepare-release.mjs';

const siteDir = fileURLToPath(new URL('../site', import.meta.url));

function withTempDir(run) {
  const dir = mkdtempSync(join(tmpdir(), 'carter-release-'));
  try {
    return run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readImportMap(html) {
  const match = html.match(/<script type="importmap">(.*?)<\/script>/s);
  assert.ok(match, 'page has an import map');
  return JSON.parse(match[1]).imports;
}

test('release stamps every module, the entry script, and the stylesheet with one build id', () => {
  withTempDir((dir) => {
    const out = join(dir, 'out');
    const { build, modules } = prepareRelease(siteDir, out);
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    const imports = readImportMap(html);

    assert.match(build, /^[0-9a-f]{12}$/);
    assert.ok(modules.includes('js/main.js'));
    assert.ok(modules.includes('vendor/three.module.js'));
    assert.ok(modules.includes('vendor/three.core.js'));
    for (const name of modules) assert.equal(imports[`./${name}`], `./${name}?build=${build}`);

    assert.ok(html.includes(`src="js/main.js?build=${build}"`));
    assert.ok(html.includes(`href="style.css?build=${build}"`));
    assert.ok(html.includes(`<meta name="build" content="${build}">`));
    assert.ok(html.indexOf('importmap') < html.indexOf('type="module"'), 'import map comes first');
  });
});

test('release leaves the source files untouched', () => {
  withTempDir((dir) => {
    const before = readFileSync(join(siteDir, 'index.html'), 'utf8');
    prepareRelease(siteDir, join(dir, 'out'));
    assert.equal(readFileSync(join(siteDir, 'index.html'), 'utf8'), before);
    assert.ok(!before.includes('?build='));
  });
});

test('changing any module changes the build id', () => {
  withTempDir((dir) => {
    const src = join(dir, 'src');
    mkdirSync(join(src, 'js'), { recursive: true });
    writeFileSync(join(src, 'index.html'), '<script type="module" src="js/main.js"></script>');
    writeFileSync(join(src, 'js/main.js'), 'import "./guard.js";');
    writeFileSync(join(src, 'js/guard.js'), 'export const speed = 1;');
    const first = prepareRelease(src, join(dir, 'a')).build;
    const again = prepareRelease(src, join(dir, 'b')).build;
    writeFileSync(join(src, 'js/guard.js'), 'export const speed = 2;');
    const changed = prepareRelease(src, join(dir, 'c')).build;

    assert.equal(first, again, 'same files give the same build id');
    assert.notEqual(first, changed);
  });
});
