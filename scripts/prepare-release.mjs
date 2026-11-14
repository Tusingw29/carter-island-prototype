// Copies site/ to _site/ and stamps every JS and CSS URL with one build hash.
//
// Why: browsers cache JS files separately. Without a stamp, a returning player can run
// a new main.js with an old guard.js. With the stamp, every file URL changes together,
// so a player gets all-old or all-new code, never a mix.
//
// How: an import map sends every "./x.js" import to "./x.js?build=<hash>". Source files
// keep plain imports, so local play needs no build step. Only CI runs this script.
import { cpSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

function listFiles(dir) {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== '.DS_Store')
    .map((entry) => join(entry.parentPath, entry.name).slice(dir.length + 1).replaceAll('\\', '/'))
    .sort();
}

function hashFiles(dir, files) {
  const hash = createHash('sha256');
  for (const name of files) hash.update(name).update(readFileSync(join(dir, name)));
  return hash.digest('hex').slice(0, 12);
}

function stampHtml(html, build, importMap) {
  const mapTag = `<script type="importmap">${JSON.stringify({ imports: importMap })}</script>`;
  let mapPlaced = false;
  return html
    .replace(/<meta name="build" content="[^"]*">/, `<meta name="build" content="${build}">`)
    .replace(/(href="[^":?]+\.css)"/g, `$1?build=${build}"`)
    .replace(/<script type="module" src="([^":?]+\.js)"><\/script>/g, (_, src) => {
      const tag = `<script type="module" src="${src}?build=${build}"></script>`;
      if (mapPlaced) return tag;
      mapPlaced = true;
      return `${mapTag}\n  ${tag}`;
    });
}

export function prepareRelease(srcDir, outDir) {
  rmSync(outDir, { recursive: true, force: true });
  cpSync(srcDir, outDir, { recursive: true, filter: (path) => !path.endsWith('.DS_Store') });

  const files = listFiles(outDir);
  const build = hashFiles(outDir, files);
  const modules = files.filter((name) => name.endsWith('.js'));
  const importMap = Object.fromEntries(modules.map((name) => [`./${name}`, `./${name}?build=${build}`]));

  // Pages must sit at the top of the site so "./js/x.js" in the import map points at the right file.
  const pages = files.filter((name) => name.endsWith('.html'));
  for (const page of pages) {
    if (page.includes('/')) throw new Error(`HTML pages must be at the top of site/: ${page}`);
    const path = join(outDir, page);
    writeFileSync(path, stampHtml(readFileSync(path, 'utf8'), build, importMap));
  }
  return { build, modules, pages };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const { build, modules, pages } = prepareRelease(join(root, 'site'), join(root, '_site'));
  console.log(`Prepared ${pages.length} page(s) and ${modules.length} module(s) with build ${build}`);
}
