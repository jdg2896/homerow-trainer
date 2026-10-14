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

if (failures) { console.error(`\n${failures} failure(s).`); process.exit(1); }
console.log(`\nAll ${presets.length} presets passed.`);
