// Refresh data/sentences.json from Tatoeba's weekly English export (CC BY 2.0 FR).
// Usage:  node tools/fetch_sentences.mjs [eng_sentences.tsv]   (then rebuild with: node build.mjs)
//
// Keeps short everyday sentences whose words are all in data/words.json, which already
// drops names, abbreviations and offensive words. Needs bunzip2 to unpack the download.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const URL = 'https://downloads.tatoeba.org/exports/per_language/eng/eng_sentences.tsv.bz2';
const DATA = path.join(import.meta.dirname, '..', 'data');
const KEEP = 4000;

const CONTRACTIONS = new Set(("i'm i've i'll i'd you're you've you'll you'd he's he'll he'd she's she'll she'd it's it'll " +
  "we're we've we'll we'd they're they've they'll they'd that's there's here's what's who's where's how's let's " +
  "don't doesn't didn't isn't aren't wasn't weren't haven't hasn't hadn't won't wouldn't can't couldn't shouldn't").split(' '));

let tsv = process.argv[2];
let tmp;
if (!tsv) {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tatoeba-'));
  const r = await fetch(URL);
  if (!r.ok) throw new Error(`${r.status} ${URL}`);
  fs.writeFileSync(path.join(tmp, 'eng.tsv.bz2'), Buffer.from(await r.arrayBuffer()));
  execFileSync('bunzip2', [path.join(tmp, 'eng.tsv.bz2')]);
  tsv = path.join(tmp, 'eng.tsv');
}

const words = new Set(JSON.parse(fs.readFileSync(path.join(DATA, 'words.json'), 'utf8')));
const known = w => words.has(w) || w === 'i' || w === 'a' || CONTRACTIONS.has(w) || (w.endsWith("'s") && words.has(w.slice(0, -2)));

function usable(s){
  if (s.length < 20 || s.length > 80 || !/^[A-Z][A-Za-z .,?!'";:()-]*[.?!]"?$/.test(s)) return false;
  const toks = s.split(' ');
  if (toks.length < 4 || toks.length > 12) return false;
  return toks.every((t, i) => {
    const w = t.replace(/^["(]+|["),.?!;:]+$/g, '');
    if (!w || (i && /[A-Z]/.test(w) && w !== 'I' && !/^I'/.test(w))) return false;   // names and places
    return w.toLowerCase().split('-').every(known);
  });
}

// Spread the pick across the corpus with a stable hash of the sentence id, so reruns only change with Tatoeba.
const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const seen = new Set(), picked = [];
for (const line of fs.readFileSync(tsv, 'utf8').split('\n')) {
  const [id, , raw] = line.split('\t');
  if (!raw) continue;
  const s = raw.trim().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ');
  const k = s.toLowerCase();
  if (seen.has(k) || !usable(s)) continue;
  seen.add(k);
  picked.push([hash(id), s]);
}
const out = picked.sort((a, b) => a[0] - b[0]).slice(0, KEEP).map(p => p[1]).sort();
fs.writeFileSync(path.join(DATA, 'sentences.json'), JSON.stringify(out, null, 0).replace(/","/g, '",\n"') + '\n');
if (tmp) fs.rmSync(tmp, { recursive: true, force: true });
console.log(`${picked.length} usable sentences; wrote ${out.length} to data/sentences.json. Now run: node build.mjs`);
