/* Built-page check. Builds dist/index.html and fails if the Content Security Policy no longer covers it:
   a script the policy doesn't hash, a request to another origin, or an inline handler that would be blocked.
   The browser would only report these at runtime, as a broken page. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
execFileSync(process.execPath, [path.join(root, 'build.mjs')], { stdio: 'ignore' });
const html = fs.readFileSync(path.join(root, 'dist', 'index.html'), 'utf8');

let failures = 0;
const fail = (where, msg) => { failures++; console.error(`FAIL  ${where}: ${msg}`); };
const ok = where => console.log(`ok  ${where}`);

// The policy only covers what comes after it, so it must be the first thing in <head> after the charset.
const meta = html.match(/^<!doctype html><html lang="en"><head><meta charset="utf-8">\s*<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
if (!meta) { fail('csp', 'no Content-Security-Policy meta tag straight after <meta charset>'); process.exit(1); }
const csp = Object.fromEntries(meta[1].split(';').map(d => d.trim().split(/\s+/)).map(([k, ...v]) => [k, v]));
ok('csp is first in <head>');

{
  const where = 'csp directives';
  if ((csp['default-src'] || []).join() !== "'none'") fail(where, `default-src is ${csp['default-src']}, not 'none'`);
  // No other origin may be contacted; add one here only with a reason in SECURITY.md.
  const ALLOWED_ORIGINS = [];
  for (const [k, v] of Object.entries(csp)) for (const s of v)
    if (/^(https?:|\*|wss?:)/.test(s) && !ALLOWED_ORIGINS.includes(s)) fail(where, `${k} allows ${s}`);
  if ((csp['script-src'] || []).some(s => s === "'unsafe-inline'" || s === "'unsafe-eval'" || s === "'unsafe-hashes'")) fail(where, `script-src is ${csp['script-src'].join(' ')}`);
  ok(where);
}

{
  const where = 'script hashes';
  const scripts = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
  const hashes = scripts.map(m => `'sha256-${crypto.createHash('sha256').update(m[2], 'utf8').digest('base64')}'`);
  scripts.forEach((m, i) => { if (m[1].trim()) fail(where, `script ${i + 1} has attributes "${m[1].trim()}"`); });
  hashes.forEach((h, i) => { if (!csp['script-src'].includes(h)) fail(where, `script ${i + 1} isn't in script-src, so it would be blocked`); });
  if (csp['script-src'].length !== hashes.length) fail(where, `script-src lists ${csp['script-src'].length} sources for ${hashes.length} scripts`);
  ok(where);
}

{
  // Outside the scripts, the page may only point at data: URLs.
  const where = 'no external resources';
  const markup = html.replace(/<script>[\s\S]*?<\/script>/g, '');
  for (const m of markup.matchAll(/(?:src|href)\s*=\s*["']?([^"'\s>]+)|url\(\s*["']?([^"')]+)|@import\s+["']?([^"';\s]+)/g)) {
    const url = m[1] || m[2] || m[3];
    if (!/^data:/.test(url)) fail(where, `the page loads ${url.slice(0, 80)}`);
  }
  ok(where);
}

{
  // Views are template strings in the scripts, so look for handler attributes and javascript: URLs in their markup.
  const where = 'no inline handlers';
  for (const f of ['src/errors.js', 'src/engine.js', 'src/ui.js']) {
    const js = fs.readFileSync(path.join(root, f), 'utf8');
    for (const m of js.matchAll(/<[a-z][^<>]*?\son[a-z]+\s*=|javascript:/gi)) fail(where, `${f}: ${m[0].slice(-60)}`);
  }
  ok(where);
}

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log('\nThe built page matches its Content Security Policy.');
