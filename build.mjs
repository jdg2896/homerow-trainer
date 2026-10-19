// Bundle src/ and data/ into one self-contained page: dist/index.html.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const root = import.meta.dirname;
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

// Version shown in the footer and attached to feedback reports. CI checks out a full SHA in GITHUB_SHA.
const pkg = JSON.parse(read('package.json'));
let commit = process.env.GITHUB_SHA || '';
if (!commit) try { commit = execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim(); } catch (e) {}
const build = { version: pkg.version, commit: commit.slice(0, 7), date: new Date().toISOString().slice(0, 10),
  repo: pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '') };

const presetDir = path.join(root, 'data', 'presets');
const presetFiles = fs.readdirSync(presetDir).filter(f => f.endsWith('.json')).sort();
if (!presetFiles.length) throw new Error('data/presets/ is empty; run tools/fetch_presets.mjs first (the first-run default layout is seeded from it).');
const presets = '[' + presetFiles.map(f => fs.readFileSync(path.join(presetDir, f), 'utf8')).join(',') + ']';

// Inline favicon so the deployed page doesn't 404 on /favicon.ico.
const FAVICON = 'data:image/svg+xml,'
  + "%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 9'%3E"
  + "%3Crect width='9' height='9' rx='2' fill='%23151C2A'/%3E"
  + "%3Crect x='2.5' y='3.5' width='4' height='2' rx='.6' fill='%23F2B705'/%3E%3C/svg%3E";

const head = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Homerow Trainer</title>
<meta name="description" content="A typing trainer for ergonomic split keyboards that builds progressive lessons from your own MoErgo or ZMK layout.">
<meta name="theme-color" content="#151C2A">
<link rel="icon" href="${FAVICON}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=IBM+Plex+Mono:wght@500;600&display=swap">
<style>${read('src/style.css')}</style>`;

const body = `<div id="app"></div>
<script>${read('src/errors.js')}</script>
<script>window.HOMEROW_TRAINER_BUILD=${JSON.stringify(build)};window.HOMEROW_TRAINER_WORDS=${read('data/words.json')};window.HOMEROW_TRAINER_SENTENCES=${read('data/sentences.json')};window.HOMEROW_TRAINER_PRESETS=${presets};</script>
<script>${read('src/engine.js')}</script>
<script>${read('src/ui.js')}</script>`;

const html = '<!doctype html><html lang="en"><head>' + head + '</head><body>' + body + '</body></html>';
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'index.html'), html);
console.log(`dist/index.html  ${html.length.toLocaleString('en-US')} bytes  v${build.version} ${build.commit || '(no commit)'}`);
