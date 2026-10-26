/* Curriculum/engine smoke test. Exits non-zero on any failure so CI can gate on it.
   Contract checked against EVERY bundled preset: the layout builds, produces lessons,
   and every generated drill item resolves to a route (a typeable hint). */
const E = require('../src/engine.js');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const W = JSON.parse(fs.readFileSync(path.join(DATA, 'words.json'), 'utf8'));
const S = JSON.parse(fs.readFileSync(path.join(DATA, 'sentences.json'), 'utf8'));
const presetDir = path.join(DATA, 'presets');
const presets = fs.readdirSync(presetDir).filter(f => f.endsWith('.json')).sort();

let failures = 0;
const fail = (where, msg) => { failures++; console.error(`FAIL  ${where}: ${msg}`); };
const DETAIL = process.argv.includes('--verbose');

if (!presets.length) fail('data/presets', 'no preset layouts found');

for (const file of presets) {
  const text = fs.readFileSync(path.join(presetDir, file), 'utf8');
  let L;
  try { L = E.buildLayout(text); }
  catch (e) { fail(file, `buildLayout threw: ${e.message}`); continue; }

  for (const pref of ['layers', 'reach']) {
    let C;
    try { C = E.buildCurriculum(L, pref); }
    catch (e) { fail(`${file} [${pref}]`, `buildCurriculum threw: ${e.message}`); continue; }

    if (!C.lessons.length) { fail(`${file} [${pref}]`, 'produced zero lessons'); continue; }
    // Progress is stored by lesson id, so ids must be unique.
    const ids = new Set(C.lessons.map(l => l.id));
    if (ids.size !== C.lessons.length) fail(`${file} [${pref}]`, `${C.lessons.length - ids.size} duplicate lesson ids`);

    // Every drill item of every lesson must resolve to a route.
    let noRoute = 0, items = 0;
    for (const l of C.lessons) {
      let stages;
      try { stages = E.makeStages(C, l, W, 90, S); }
      catch (e) { fail(`${file} [${pref}]`, `makeStages threw for "${l.title}": ${e.message}`); continue; }
      for (const st of stages) for (const it of st.items) {
        items++;
        if (!E.routeFor(L, C, it, pref)) {
          noRoute++;
          if (DETAIL) console.error(`  NO ROUTE ${file} [${pref}] "${l.title}": ${JSON.stringify(it)}`);
        }
      }
    }
    if (noRoute) fail(`${file} [${pref}]`, `${noRoute}/${items} drill items have no route`);
    console.log(`ok  ${file.padEnd(52)} [${pref}]  ${C.lessons.length} lessons, ${items} items`);
  }
}

// Dedicated Shift keys (&kp LSHFT) count as Shift, and modPref picks them or home row mods
// when a layout has both (issue #2).
{
  const where = 'modifier keys';
  const raw = JSON.parse(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8'));
  const shiftOf = (L, pref) => { const r = E.buildCurriculum(L, 'layers', pref).routes.chars.A; return r && r.holds[0] && r.holds[0].pos; };
  const L = E.buildLayout(JSON.stringify(raw));
  const thumb = shiftOf(L);
  if (thumb == null || !L.keys[thumb].thumb) fail(where, `factory default should shift A with a thumb key, got ${thumb}`);
  const hrm = JSON.parse(JSON.stringify(raw));
  const j = hrm.layers[0].findIndex(b => b.value === '&kp' && b.params[0].value === 'J');
  hrm.layers[0][j] = { value: '&mt', params: [{ value: 'RSHFT' }, { value: 'J' }] };
  const H = E.buildLayout(JSON.stringify(hrm));
  if (!E.buildRoutes(H, 'layers').bothModKinds) fail(where, 'layout with &mt and &kp Shift should report both kinds');
  if (shiftOf(H, 'homerow') !== j) fail(where, `homerow pref should shift A with J (${j}), got ${shiftOf(H, 'homerow')}`);
  if (!H.keys[shiftOf(H, 'dedicated')].thumb) fail(where, 'dedicated pref should shift A with a thumb key');
  console.log(`ok  ${where}`);
}

// Drill text varies its numbers, punctuation and letter groups (issue #3). Sampled many
// times so the random choices can't make this flaky.
{
  const where = 'realistic text';
  const L = E.buildLayout(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8'));
  const C = E.buildCurriculum(L, 'layers');
  const all = E.unlockedBefore(C, C.lessons[C.lessons.length - 1], true);
  const text = stages => stages.map(s => s.items.map(i => i.ch).join('')).join(' ');
  let practice = '', code = '';
  for (let i = 0; i < 30; i++) practice += text(E.practiceStages(C, all, [], W, 90, S)) + ' ';
  for (const l of C.lessons.filter(l => l.items.some(c => /[-:.\/]/.test(c)))) for (let i = 0; i < 5; i++) code += text(E.makeStages(C, l, W, 90, S)) + ' ';
  const nums = new Set(code.match(/\d+[-:.\/]\d+(?:[-:.\/]\d+)*/g) || []);
  if (nums.size < 10) fail(where, `only ${nums.size} distinct numbers with separators in code drills`);
  if (!practice.includes('"')) fail(where, 'practice sentences never use quotes');
  if (!/[a-z]'[a-z]/.test(practice)) fail(where, 'practice sentences never use contractions');
  if (!/\b(the|ing|tion)\b/.test(practice)) fail(where, 'practice has no common letter groups');
  if (!S.some(s => practice.includes(s))) fail(where, 'practice never uses a real sentence from data/sentences.json');
  console.log(`ok  ${where}`);
}

// Weak letter pairs are weighted into Common combos, in practice and in reviews (learning principle 6).
{
  const where = 'weak pairs';
  const L = E.buildLayout(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8'));
  const C = E.buildCurriculum(L, 'layers');
  const all = E.unlockedBefore(C, C.lessons[C.lessons.length - 1], true);
  const combos = stages => (stages.find(s => s.name === 'Common combos') || { items: [] }).items.map(i => i.ch).join('');
  // "wn" isn't one of the NGRAMS, so without weighting it only turns up inside words.
  const count = (t, p) => t.split(p).length - 1;
  let plain = 0, weighted = 0, review = 0;
  // The last letters review, by which point w and n are unlocked. Only letter reviews have a Common combos stage.
  const rv = C.lessons.filter(l => l.kind === 'review' && l.items.some(c => /[a-z]/.test(c))).pop();
  for (let i = 0; i < 30; i++) {
    plain += count(combos(E.practiceStages(C, all, [], W, 90, S)), 'wn');
    weighted += count(combos(E.practiceStages(C, all, [], W, 90, S, ['wn'])), 'wn');
    if (rv) review += count(combos(E.makeStages(C, rv, W, 90, S, ['wn'])), 'wn');
  }
  if (weighted < Math.max(30, plain * 3)) fail(where, `"wn" appeared ${weighted} times weighted vs ${plain} unweighted in 30 practice runs`);
  if (rv && review < 15) fail(where, `"wn" appeared only ${review} times in 30 runs of review "${rv.title}"`);
  if (!combos(E.practiceStages(C, all, ['q'], W, 90, S, ['wn'])).includes('wn')) fail(where, 'problem-key practice drops weak pairs that miss the focus keys');
  console.log(`ok  ${where} (wn: ${plain} → ${weighted} in practice${rv ? `, ${review} in a review` : ''})`);
}

// Keys not typed lately come back: free practice opens with them, and mixed drills weight them (learning principle 7).
{
  const where = 'stale keys';
  const L = E.buildLayout(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8'));
  const C = E.buildCurriculum(L, 'layers');
  const all = E.unlockedBefore(C, C.lessons[C.lessons.length - 1], true);
  // The random fill used to skip a key about once in 80 runs, so check enough runs to catch that.
  const staleSets = [['q', 'z', ';'], ['q', 'z', 'x', 'j', 'k', 'v', '7', '0', '3', ';', '(', '[', '/']];
  for (let i = 0; i < 200; i++) {
    const keys = staleSets[i % 2], free = E.practiceStages(C, all, [], W, 90, S, [], keys);
    const first = free[0] && free[0].items.map(i => i.ch).join('');
    if (!first || free[0].name !== 'Not typed lately') { fail(where, `free practice should open with "Not typed lately", got "${free[0] && free[0].name}"`); break; }
    const miss = keys.filter(c => !first.includes(c));
    if (miss.length) { fail(where, `"Not typed lately" misses stale ${miss.join(' ')}: ${first}`); break; }
  }
  if (E.practiceStages(C, all, [], W, 90, S)[0].name === 'Not typed lately') fail(where, 'free practice adds the stale stage with no stale keys');
  if (E.practiceStages(C, all, ['e'], W, 90, S, [], ['q']).some(s => s.name === 'Not typed lately')) fail(where, 'problem-key practice should stay on its focus keys');
  // A later letter lesson's mixed drill: a stale earlier key shows up clearly more often than without weighting.
  const l = C.lessons.filter(x => x.kind === 'learn' && x.items.some(c => /[a-z]/.test(c)))[6];
  const old = [...E.unlockedBefore(C, l, false)].find(c => /[a-z]/.test(c));
  const mixed = st => (st.find(s => s.name === 'Mixed drill') || { items: [] }).items.filter(i => i.ch === old).length;
  let plain = 0, weighted = 0;
  for (let i = 0; i < 40; i++) { plain += mixed(E.makeStages(C, l, W, 90, S)); weighted += mixed(E.makeStages(C, l, W, 90, S, [], [old])); }
  if (weighted < plain * 1.8) fail(where, `stale "${old}" appeared ${weighted} times weighted vs ${plain} unweighted in "${l.title}" mixed drills`);
  console.log(`ok  ${where} ("${old}" in mixed drills: ${plain} → ${weighted})`);
}

// Punctuation reads the way it's used: apostrophes as contractions or possessives outside code, and code
// drills without prose fragments like "share." between snippets.
{
  const where = 'punctuation in context';
  const L = E.buildLayout(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8'));
  const C = E.buildCurriculum(L, 'layers');
  const text = st => st.items.map(i => i.ch).join('');
  let prose = '', code = '';
  for (const l of C.lessons.filter(l => l.kind !== 'review' && l.items.some(c => /['.,;:!?]/.test(c)))) for (let i = 0; i < 10; i++)
    for (const st of E.makeStages(C, l, W, 90, S)) {
      if (/In context|Prose/.test(st.name) && l.items.includes("'")) prose += text(st) + ' ';
      if (st.name === 'Code') code += text(st) + ' ';
    }
  const quoted = prose.match(/(^|\s)'[a-z]+'(?=\s|$)/g), poss = prose.match(/\b[a-z]*s's\b/g);
  if (quoted) fail(where, `prose apostrophes used as quotes: ${quoted.slice(0, 3).join(' ')}`);
  if (poss) fail(where, `possessive on a word ending in s: ${poss.slice(0, 3).join(' ')}`);
  if (!/[a-z]'[a-z]/.test(prose)) fail(where, 'no contractions or possessives in apostrophe prose');
  // A statement (`ask;`) or a key (`city: cup`) is fine; a word ending in . , ! or ? reads as prose.
  const stray = code.match(/(^|\s)[a-z]{2,}[.,!?](?=\s|$)/g);
  if (stray) fail(where, `prose-style tokens in code drills: ${stray.slice(0, 4).join(' ')}`);
  console.log(`ok  ${where}`);
}

// Files that parse but can't build a course are refused with a reason, instead of becoming an empty "Untitled layout".
{
  const where = 'empty layouts';
  const refuse = (text, re) => { try { E.buildLayout(text); fail(where, `accepted ${text}`); } catch (e) { if (!re.test(e.message)) fail(where, `${text}: unexpected "${e.message}"`); } };
  refuse('{"keyboard":"go60","layers":[[]]}', /no keys/);
  refuse('{"keyboard":"go60","layers":[[{"value":"&none","params":[]}]]}', /nothing to build/);
  refuse('hello', /isn't a layout file/);
  console.log(`ok  ${where}`);
}

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${presets.length} presets passed.`);
