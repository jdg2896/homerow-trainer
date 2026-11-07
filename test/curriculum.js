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

// Settings only offers the numbers & symbols choice when a layout has both a number row and a layer for them.
{
  const where = 'route kinds';
  const both = f => E.buildRoutes(E.buildLayout(fs.readFileSync(path.join(presetDir, f), 'utf8')), 'layers').bothRouteKinds;
  if (!both('go60-07-miryoku-macos.json')) fail(where, 'Miryoku on Go60 has a number row and a numbers layer, so should report both');
  if (both('glove80-07-glove80-factory-default-layout.json')) fail(where, 'Glove80 factory default only types digits from the number row, so should report one');
  console.log(`ok  ${where}`);
}

// "Number row and reach keys" means it: what the base layer types, bare or with Shift, doesn't come from a layer (issue #47).
{
  const where = 'reach routes';
  for (const f of ['go60-07-miryoku-macos.json', 'go60-10-voyager-inspired-layout.json', 'glove80-01-advanced-layout-example.json']) {
    const L = E.buildLayout(fs.readFileSync(path.join(presetDir, f), 'utf8')), R = E.buildRoutes(L, 'reach', 'auto');
    for (const d of '0123456789') if (R.chars[d] && R.chars[d].layer) fail(where, `${f}: ${d} should come from the number row`);
    for (const c of '!@#$%^&*()') if (R.chars[c] && R.chars[c].layer) fail(where, `${f}: ${c} should be Shift on the number row`);
  }
  const G = E.buildLayout(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8'));
  if (E.buildRoutes(G, 'reach', 'auto', 'numpad').chars['5'].layer !== G.layerNames.indexOf('Lower')) fail(where, 'the number pad choice should still win over reach');
  console.log(`ok  ${where}`);
}

// MoErgo's &lower reaches the Lower layer's number pad (issue #45). Digits stay on the number row
// unless numPref asks for the numpad, and nothing else moves to Lower when another key types it.
{
  const where = 'lower numpad';
  const L = E.buildLayout(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8'));
  const lower = L.layerNames.indexOf('Lower');
  const lk = L.layers[0].find(k => k.beh === '&lower');
  if (!lk || !lk.hold || lk.hold.layer !== lower) fail(where, `&lower should hold the Lower layer (${lower})`);
  const row = E.buildCurriculum(L, 'layers', 'auto', 'row'), pad = E.buildCurriculum(L, 'layers', 'auto', 'numpad');
  if (row.routes.numpad !== lower) fail(where, `routes should name Lower (${lower}) as the numpad, got ${row.routes.numpad}`);
  for (const d of '0123456789') {
    if (row.routes.chars[d].layer !== 0) fail(where, `${d} should stay on the number row by default`);
    if (pad.routes.chars[d].layer !== lower) fail(where, `${d} should come from Lower with numPref numpad`);
  }
  if (row.units.some(u => u.id === 'layer-' + lower)) fail(where, 'the default course should not gain a Lower unit');
  for (const c of '%)*') if (pad.routes.chars[c].layer !== 0) fail(where, `${c} should still be Shift on the number row with the numpad on`);
  const M = E.buildRoutes(E.buildLayout(fs.readFileSync(path.join(presetDir, 'go60-07-miryoku-macos.json'), 'utf8')), 'layers');
  if (M.numpad != null) fail(where, 'Miryoku has no &lower numpad, so should not offer one');
  console.log(`ok  ${where}`);
}

// MoErgo's &layer N is the same tap-dance as &lower for any layer (issue #48). Go60's factory layout reaches
// Keypad and SymbolNav only through it: Keypad is the numpad, and Keypad's Ctrl+C doesn't replace the chord.
{
  const where = 'layer numpad';
  const L = E.buildLayout(fs.readFileSync(path.join(presetDir, 'go60-04-factory-default-layout.json'), 'utf8'));
  const keypad = L.layerNames.indexOf('Keypad'), symnav = L.layerNames.indexOf('SymbolNav');
  const holds = L.layers[0].filter(k => k.beh === '&layer').map(k => k.hold && k.hold.layer).sort();
  if (holds.join() !== [keypad, symnav].join()) fail(where, `&layer keys should hold Keypad and SymbolNav, got ${holds}`);
  const row = E.buildCurriculum(L, 'layers', 'auto', 'row'), pad = E.buildCurriculum(L, 'layers', 'auto', 'numpad');
  if (row.routes.numpad !== keypad) fail(where, `routes should name Keypad (${keypad}) as the numpad, got ${row.routes.numpad}`);
  for (const d of '0123456789') {
    if (row.routes.chars[d].layer !== 0) fail(where, `${d} should stay on the number row by default`);
    if (pad.routes.chars[d].layer !== keypad) fail(where, `${d} should come from Keypad with numPref numpad`);
  }
  if (row.units.some(u => /^layer-/.test(u.id))) fail(where, 'the default course should not gain a Keypad or SymbolNav unit');
  if (!row.routes.keys.ArrowLeft) fail(where, 'arrows on the &layer layers should now be reachable');
  // Keypad's own Ctrl+C is taught in its layer shortcuts unit (issue #50), so it's hinted there, and nowhere else.
  const cc = E.routeFor(L, row, E.keyItem('ctrl+c'), 'layers'), ccIn = row.lessons.filter(l => l.kind === 'chords' && l.items.includes('ctrl+c'));
  if (!cc || cc.layer !== keypad || ccIn.length !== 1 || ccIn[0].unit !== 'lkeys-' + keypad) fail(where, 'Ctrl+C should be taught and hinted on the Keypad layer, once');
  const bad = E.buildLayout(JSON.stringify({ layers: [[{ value: '&kp', params: [{ value: 'A' }] }, { value: '&layer', params: [{ value: 7 }] }, { value: '&layer', params: [{ value: 'x' }] }]] }));
  if (bad.layers[0].slice(1).some(k => k.hold)) fail(where, '&layer with a missing or non-numeric layer should not hold anything');
  console.log(`ok  ${where}`);
}

// Shortcuts a layer key sends get a unit per layer, hinted on that key, and aren't taught again with home row mods (issue #50).
{
  const where = 'layer shortcuts';
  const raw = JSON.parse(fs.readFileSync(path.join(presetDir, 'glove80-01-advanced-layout-example.json'), 'utf8'));
  // Shortcuts the browser or OS keeps for itself, on free Cursor layer keys. macOS keeps Ctrl+← for Spaces.
  const cursor = raw.layer_names.indexOf('Cursor'), free = raw.layers[cursor].map((b, p) => b.value === '&none' || b.value === '&trans' ? p : -1).filter(p => p >= 0);
  raw.layers[cursor][free[0]] = { value: '&kp', params: [{ value: 'LC', params: [{ value: 'W' }] }] };
  raw.layers[cursor][free[1]] = { value: '&kp', params: [{ value: 'LC', params: [{ value: 'TAB' }] }] };
  raw.layers[cursor][free[2]] = { value: '&kp', params: [{ value: 'LC', params: [{ value: 'LEFT' }] }] };
  const L = E.buildLayout(JSON.stringify(raw));
  const C = E.buildCurriculum(L, 'layers');
  const unit = C.units.find(u => u.id === 'lkeys-' + cursor);
  const order = C.units.map(u => u.id);
  if (!unit || unit.title !== 'Cursor layer shortcuts') fail(where, `no "Cursor layer shortcuts" unit: ${order.join(' ')}`);
  else {
    const at = order.indexOf(unit.id);
    if (at < order.indexOf('nav') || (order.includes('chords') && at > order.indexOf('chords'))) fail(where, `unit should sit between Navigation and Shortcuts: ${order.join(' ')}`);
    const taught = unit.lessons.filter(l => l.kind === 'chords').flatMap(l => l.items);
    // TailorKey's copy and paste are one-key macros (&cur_COPY_v1_TKZ), Ctrl+Shift+G is a plain &kp with two mods.
    for (const id of ['ctrl+c', 'ctrl+v', 'ctrl+z', 'ctrl+e', 'ctrl+shift+g']) if (!taught.includes(id)) fail(where, `${id} missing from the Cursor unit`);
    for (const id of ['ctrl+w', 'ctrl+Tab', 'ctrl+ArrowLeft']) {
      if (!C.routes.keys[id]) fail(where, `${id} should still be routed`);
      if (C.lessons.some(l => l.items.includes(id))) fail(where, `${id} can't reach the page, so no lesson should drill it`);
    }
    if (taught.some(id => !/ctrl|alt|meta/.test(id))) fail(where, `a shift-only or bare key in the unit: ${taught.join(' ')}`);
    for (const id of taught) {
      const r = E.routeFor(L, C, E.keyItem(id), 'layers');
      if (!r || r.layer !== cursor || !r.holds.length || r.holds[0].kind !== 'layer' || r !== C.routes.keys[id]) fail(where, `${id} should hint the Cursor layer key, got ${JSON.stringify(r)}`);
    }
    if (!unit.lessons.some(l => l.kind === 'review' && l.reviewKind === 'chords')) fail(where, 'the unit has no review');
    const rv = unit.lessons.find(l => l.kind === 'review');
    if (rv && !E.makeStages(C, rv, W, 90, S).every(st => st.items.every(it => it.t === 'k'))) fail(where, 'a shortcuts review should drill shortcuts');
  }
  // Off a Mac the Windows key's shortcuts never reach the page, Ctrl+← does, and titles spell modifiers out.
  const pc = E.buildCurriculum(L, 'layers', 'auto', 'row', { mac: false, names: { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Win' } });
  const pcUnit = pc.units.find(u => u.id === 'lkeys-' + cursor), pcTaught = pcUnit ? pcUnit.lessons.flatMap(l => l.items) : [];
  if (!pcTaught.includes('ctrl+c') || !pcTaught.includes('ctrl+ArrowLeft') || pcTaught.some(id => /meta/.test(id))) fail(where, `off a Mac the Cursor unit should keep Ctrl shortcuts and drop Win ones: ${pcTaught.join(' ')}`);
  if (!pcUnit || !pcUnit.lessons.some(l => /Ctrl\+/.test(l.title) && /copy/.test(l.title)) || pcUnit.lessons.some(l => /⌃/.test(l.title))) fail(where, `off a Mac titles should say Ctrl+ and name Copy: ${pcUnit && pcUnit.lessons.map(l => l.title).join(' / ')}`);
  // Ctrl+E and Ctrl+K were in "Control line editing" too; each shortcut is drilled by one lesson only, across every preset, on a Mac or not.
  for (const f of presets.concat('*glove80-01 + Ctrl+W')) for (const mac of [true, false]) {
    const CC = f.startsWith('*') ? (mac ? C : pc) : E.buildCurriculum(E.buildLayout(fs.readFileSync(path.join(presetDir, f), 'utf8')), 'layers', 'auto', 'row', { mac });
    const seen = {};
    for (const l of CC.lessons) if (l.kind === 'keys' || l.kind === 'chords') for (const id of l.items) {
      if (seen[id]) fail(where, `${f}: ${id} is in "${seen[id]}" and "${l.title}"`);
      seen[id] = l.title;
    }
  }
  // Miryoku's Navigation layer sends Ctrl+Shift+Z, which used to be built from home row mods.
  const M = E.buildLayout(fs.readFileSync(path.join(presetDir, 'go60-08-miryoku-windows-linux.json'), 'utf8')), MC = E.buildCurriculum(M, 'layers');
  const redo = E.routeFor(M, MC, E.keyItem('ctrl+shift+z'), 'layers');
  if (!redo || redo.layer !== 1 || redo.holds.some(h => h.kind === 'mod')) fail(where, `Miryoku Ctrl+Shift+Z should be its Navigation key, got ${JSON.stringify(redo)}`);
  // A layout whose layers send no shortcuts keeps the course it had.
  const plain = E.buildCurriculum(E.buildLayout(fs.readFileSync(path.join(presetDir, 'glove80-07-glove80-factory-default-layout.json'), 'utf8')), 'layers');
  if (plain.units.some(u => u.id.startsWith('lkeys-'))) fail(where, 'factory default should have no layer shortcuts unit');
  if (!plain.lessons.some(l => l.id === 'chord:ctrl+a,ctrl+e,ctrl+k')) fail(where, 'factory default lost "Control line editing"');
  console.log(`ok  ${where} (${unit ? unit.lessons.length : 0} Cursor lessons)`);
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

// Off a Mac, Cmd is the Windows/Super key, so shortcuts use Ctrl and the macOS-only Ctrl line editing set goes (issue #49).
{
  const where = 'shortcuts by platform';
  const chords = (file, opts) => {
    const L = E.buildLayout(fs.readFileSync(path.join(presetDir, file), 'utf8')), C = E.buildCurriculum(L, 'layers', 'auto', 'row', opts);
    const u = C.units.find(u => u.id === 'chords');
    for (const l of u ? u.lessons : []) for (const id of l.items) if (!E.routeFor(L, C, E.keyItem(id), 'layers')) fail(where, `${file}: no route for ${id}`);
    return u ? u.lessons.map(l => l.title + ': ' + l.items.join(' ')) : [];
  };
  const hrm = 'glove80-08-advanced-home-row-mods-hrm-example-v35.json';
  const want = ['Copy, paste, cut: meta+c meta+v meta+x', 'Redo and formatting: meta+b meta+i meta+shift+z'];
  const mac = chords(hrm, { mac: true }), win = chords(hrm, { mac: false });
  if (JSON.stringify(mac) !== JSON.stringify(want)) fail(where, `Mac shortcuts changed: ${JSON.stringify(mac)}`);
  if (JSON.stringify(chords(hrm)) !== JSON.stringify(want)) fail(where, 'no platform should mean a Mac');
  if (JSON.stringify(win) !== JSON.stringify(want.map(s => s.replace(/meta\+/g, 'ctrl+')))) fail(where, `off-Mac shortcuts: ${JSON.stringify(win)}`);
  const qw = 'glove80-04-qwerty-default.json';
  if (!chords(qw, { mac: true }).some(s => s.startsWith('Control line editing'))) fail(where, 'Mac lost Control line editing');
  const qwWin = chords(qw, { mac: false });
  if (qwWin.some(s => /line editing|meta/.test(s)) || qwWin.length !== 3) fail(where, `off-Mac qwerty shortcuts: ${JSON.stringify(qwWin)}`);
  if (E.keyItemLabel(E.keyItem('ctrl+shift+z'), { ctrl: 'Ctrl', alt: 'Alt', shift: 'Shift', meta: 'Win' }) !== 'Ctrl+Shift+Z' || E.keyItemLabel(E.keyItem('meta+shift+z')) !== '⇧⌘Z')
    fail(where, 'shortcut labels');
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

// A file's names end up sliced and shown as text, so odd types must come out as strings.
{
  const where = 'odd field types';
  const base = JSON.parse(fs.readFileSync(path.join(presetDir, presets[0]), 'utf8'));
  const L = E.buildLayout(JSON.stringify(Object.assign({}, base, { title: { a: 1 }, uuid: [1], layer_names: [7, null, '<b>'] })));
  if (typeof L.title !== 'string' || typeof L.id !== 'string' || L.uuid !== '') fail(where, `title ${typeof L.title}, id ${typeof L.id}, uuid ${JSON.stringify(L.uuid)}`);
  if (!L.layerNames.every(n => typeof n === 'string') || L.layerNames[0] !== 'Base' || L.layerNames[2] !== '<b>') fail(where, `layer names ${JSON.stringify(L.layerNames)}`);
  try { E.buildLayout(JSON.stringify(Object.assign({}, base, { macros: [null, 7, { name: 5, bindings: [{ value: '&kp' }] }, { bindings: null }] }))); }
  catch (e) { fail(where, `odd macros threw: ${e.message}`); }
  // Stats keys come from backups, so any string has to survive being read as a key item.
  for (const id of ['a\nb', '\n', 'ctrl+\n', 'ctrl++']) if (!E.keyItem(id).key) fail(where, `keyItem(${JSON.stringify(id)}) has no key`);
  console.log(`ok  ${where}`);
}

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${presets.length} presets passed.`);
