// Refresh data/presets/ from the layouts MoErgo's editors currently ship.
// Usage:  node tools/fetch_presets.mjs   (then rebuild with: python3 build.py)
//
// Each editor (go60, glove80) bundles its built-in keymaps as hashed ESM
// chunks referenced from its index bundle. We discover them from the live
// index (robust to redeploys), evaluate each module, and write its default
// export — a standard MoErgo layout object — as JSON that build.py bundles.
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const BOARDS = ['go60', 'glove80'];
const OUT = path.join(import.meta.dirname, '..', 'data', 'presets');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'moergo-presets-'));

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'layout';
// Friendly title when the layout ships without one (both editors' "default" = QWERTY).
const titleFor = (d, name) => d.title || (/qwerty/.test((d.tags || []).join()) || /default/.test(name) ? 'QWERTY (Default)' : name.replace(/^keymap_|\.json$/g, ''));

async function fetchText(url){ const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); }

async function board(bd){
  const base = `https://my.moergo.com/${bd}`;
  const idx = (await fetchText(base + '/')).match(/assets\/(index-[^"]+\.js)/)[1];
  const js = await fetchText(`${base}/assets/${idx}`);
  const re = new RegExp(`"/src/resources/config/keyboards/${bd}/(keymap_[^"]+\\.json)":\\(\\)=>X\\(\\(\\)=>import\\("(\\./[^"]+\\.js)"\\)`, 'g');
  const results = [];
  let m, order = 0;
  while ((m = re.exec(js))) {
    const [, name, chunk] = m;
    if (name.includes('config_param')) continue;            // not a layout
    const code = await fetchText(`${base}/assets/${chunk.replace('./', '')}`);
    const f = path.join(TMP, `${bd}_${name.replace(/\W/g, '_')}.mjs`);
    fs.writeFileSync(f, code);
    const d = (await import(pathToFileURL(f).href)).default;
    if (!Array.isArray(d.layers) || !d.layers.length) continue;
    d.title = titleFor(d, name);
    const idxStr = String(++order).padStart(2, '0');
    const file = `${bd}-${idxStr}-${slug(d.title)}.json`;
    fs.writeFileSync(path.join(OUT, file), JSON.stringify(d));
    results.push(`${file}  "${d.title}"`);
  }
  return results;
}

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let total = 0;
for (const bd of BOARDS) {
  const r = await board(bd);
  console.log(`\n${bd}: ${r.length} layouts`);
  r.forEach(x => console.log('  ' + x));
  total += r.length;
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\nWrote ${total} presets to data/presets/. Now run: python3 build.py`);
