/* Curriculum/engine smoke test. Exits non-zero on any failure so CI can gate on it.
   Contract checked against EVERY bundled preset: the layout builds, produces lessons,
   and every generated drill item resolves to a route (a typeable hint). */
const E = require('../src/engine.js');
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');
const W = JSON.parse(fs.readFileSync(path.join(DATA, 'words.json'), 'utf8'));
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

    // Every drill item of every lesson must resolve to a route.
    let noRoute = 0, items = 0;
    for (const l of C.lessons) {
      let stages;
      try { stages = E.makeStages(C, l, W, 90); }
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

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${presets.length} presets passed.`);
